import { readFileSync } from 'node:fs';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';

const catalogue = JSON.parse(readFileSync(new URL('../../catalog/tools.json', import.meta.url)));
const validator = new AjvJsonSchemaValidator();
const validators = new Map();

function validateInput(name, input) {
  const tool = catalogue.tools.find(item => item.name === name);
  if (!tool || !tool.visibility.includes('model')) throw new Error('Unsupported example tool.');
  let validate = validators.get(name);
  if (!validate) {
    validate = validator.getValidator(tool.inputSchema);
    validators.set(name, validate);
  }
  if (!validate(input).valid) {
    throw new Error('Invalid ' + name + ' input. Check the tool reference and your local input file.');
  }
}

/** Plans are checked before authentication or any network request. */
export function makePlan(command, { input = {}, confirmWrite = false, confirmCredits = false } = {}) {
  const operations = {
    discover: { tool: 'list_brands', scopes: ['brands:read'] },
    analytics: { tool: 'get_analytics_summary', scopes: ['brands:read', 'analytics:read'] },
    draft: { tool: 'create_draft', scopes: ['brands:read', 'posts:write'], writes: true },
    schedule: { tool: 'schedule_post', scopes: ['brands:read', 'posts:read', 'posts:schedule'], writes: true },
  };
  const operation = operations[command];
  if (!operation) throw new Error('Choose discover, analytics, draft, or schedule.');
  if (operation.writes && !confirmWrite) throw new Error('Add --confirm-write after reviewing the exact input.');
  validateInput(operation.tool, input);
  if (command === 'schedule' && new Date(input.scheduledAt).getTime() <= Date.now()) {
    throw new Error('Scheduling requires an explicit future date/time with a UTC offset.');
  }
  return Object.freeze({ command, input: structuredClone(input), confirmCredits, ...operation });
}

function resultData(result) {
  if (result.isError) throw new Error('Publinio rejected the request. Inspect permissions, input, approval and credit availability in Publinio.');
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find(item => item.type === 'text')?.text;
  if (!text) throw new Error('Publinio returned no structured result.');
  try { return JSON.parse(text); }
  catch { throw new Error('Publinio returned an unexpected result.'); }
}

async function callTool(client, name, input) {
  let result;
  try { result = await client.callTool({ name, arguments: input }); }
  catch { throw new Error('The MCP request failed. Check your connection, permissions and saved state before retrying.'); }
  return resultData(result);
}

export async function runPlan(client, plan) {
  if (plan.command === 'discover') {
    const tools = [];
    const seen = new Set();
    let cursor;
    do {
      let page;
      try { page = await client.listTools(cursor ? { cursor } : {}); }
      catch { throw new Error('Tool discovery failed. Check your connection and permissions.'); }
      tools.push(...page.tools);
      cursor = page.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error('Tool discovery returned a repeated cursor.');
      if (cursor) seen.add(cursor);
      if (seen.size >= 100) throw new Error('Tool discovery exceeded the page limit.');
    } while (cursor);
    const brands = await callTool(client, 'list_brands', plan.input);
    return { tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      visibility: tool._meta?.ui?.visibility ?? ['model', 'app'],
    })), brands };
  }
  if (plan.command === 'schedule') {
    const post = await callTool(client, 'get_post', { postId: plan.input.postId });
    if (post.revision !== plan.input.revision) throw new Error('The post changed. Review the current revision before scheduling.');
    if (['scheduled', 'queued', 'publishing', 'published', 'cancelled'].includes(post.status)) {
      throw new Error('The post is not an editable draft. Check its saved state before retrying.');
    }
    if (post.platform === 'x' && !plan.confirmCredits) {
      throw new Error('X scheduling reserves workspace credits. Review its price in Publinio, then add --confirm-credits.');
    }
  }
  return callTool(client, plan.tool, plan.input);
}
