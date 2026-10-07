import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlan, runPlan } from '../examples/lib/workflows.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';

const catalogue = JSON.parse(readFileSync(new URL('../catalog/tools.json', import.meta.url)));
const postId = '00000000-0000-4000-8000-000000000002';
async function withMcp(run, { platform = 'linkedin' } = {}) {
  const server = new Server({ name: 'local-example-fixture', version: '1.0.0' }, { capabilities: { tools: {} } });
  let post = { id: postId, revision: 2, status: 'draft', platform, content: 'Reviewed demo content' };
  const names = ['list_brands','get_post','create_draft','schedule_post','get_analytics_summary'];
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: catalogue.tools.filter(tool => names.includes(tool.name)).map(tool => ({
      name: tool.name, description: tool.description, inputSchema: tool.inputSchema,
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const input = params.arguments ?? {};
    let value;
    if (params.name === 'list_brands') value = { data: [{id:'demo-brand',name:'Demo brand'}], nextCursor:null };
    else if (params.name === 'get_post') value = post;
    else if (params.name === 'create_draft') {
      post = { id: postId, revision: 1, status: 'draft', platform: input.platform, content: input.content };
      value = post;
    } else if (params.name === 'schedule_post') {
      post = { ...post, status:'scheduled', scheduled_at:input.scheduledAt };
      value = post;
    } else if (params.name === 'get_analytics_summary') {
      value = { captured_at:'2026-10-06T10:00:00Z', period:'saved lifetime', views:null, likes:17 };
    } else return { isError:true, content:[{type:'text',text:'Unsupported fixture tool.'}] };
    return { content:[{type:'text',text:JSON.stringify(value)}], structuredContent:value };
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({name:'local-example-test',version:'1.0.0'});
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try { await run(client); }
  finally { await client.close(); await server.close(); }
}

test('a write example refuses to run without explicit confirmation', () => {
  assert.throws(() => makePlan('draft', {
    input: {brandId:'demo-brand',platform:'linkedin',content:'A reviewable draft',idempotencyKey:'draft-demo-1'},
  }), /confirm-write/);
});

test('discovery reads accessible brands through MCP without changing a saved draft', async () => {
  await withMcp(async client => {
    const result = await runPlan(client, makePlan('discover'));
    assert.equal(result.brands.data[0].name, 'Demo brand');
    const saved = await client.callTool({name:'get_post',arguments:{postId}});
    assert.equal(saved.structuredContent.status, 'draft');
  });
});

test('confirmed content creation saves a draft through the MCP protocol', async () => {
  await withMcp(async client => {
    const result = await runPlan(client, makePlan('draft', {confirmWrite:true,input:{
      brandId:'demo-brand',platform:'linkedin',content:'Reviewed copy',idempotencyKey:'draft-demo-1',
    }}));
    assert.equal(result.status, 'draft');
    const saved = await client.callTool({name:'get_post',arguments:{postId}});
    assert.equal(saved.structuredContent.content, 'Reviewed copy');
  });
});

test('a stale scheduling revision leaves the saved post as a draft', async () => {
  await withMcp(async client => {
    const plan = makePlan('schedule', {confirmWrite:true,input:{
      postId,revision:1,scheduledAt:'2030-01-15T09:00:00+01:00',idempotencyKey:'schedule-demo-1',
    }});
    await assert.rejects(runPlan(client, plan), /post changed/i);
    const saved = await client.callTool({name:'get_post',arguments:{postId}});
    assert.equal(saved.structuredContent.status, 'draft');
  });
});

test('X scheduling without credit consent leaves the saved post as a draft', async () => {
  await withMcp(async client => {
    const plan = makePlan('schedule', {confirmWrite:true,input:{
      postId,revision:2,scheduledAt:'2030-01-15T09:00:00+01:00',idempotencyKey:'schedule-demo-1',
    }});
    await assert.rejects(runPlan(client, plan), /confirm-credits/);
    const saved = await client.callTool({name:'get_post',arguments:{postId}});
    assert.equal(saved.structuredContent.status, 'draft');
  }, { platform:'x' });
});

test('confirmed scheduling reports the returned saved state and explicit offset', async () => {
  await withMcp(async client => {
    const result = await runPlan(client, makePlan('schedule', {confirmWrite:true,input:{
      postId,revision:2,scheduledAt:'2030-01-15T09:00:00+01:00',idempotencyKey:'schedule-demo-1',
    }}));
    assert.equal(result.status, 'scheduled');
    assert.equal(result.scheduled_at, '2030-01-15T09:00:00+01:00');
  });
});

test('saved analytics preserve unknown metrics and their capture time', async () => {
  await withMcp(async client => {
    const result = await runPlan(client, makePlan('analytics', {input:{
      brandId:'demo-brand',since:'2026-10-01',until:'2026-10-07',
    }}));
    assert.equal(result.views, null);
    assert.equal(result.captured_at, '2026-10-06T10:00:00Z');
  });
});

test('invalid input and an expired scheduling time are rejected before connection', () => {
  assert.throws(() => makePlan('draft', {confirmWrite:true,input:{
    brandId:'demo-brand',platform:'linkedin',content:'Draft',idempotencyKey:'short',
  }}), /invalid/i);
  assert.throws(() => makePlan('schedule', {confirmWrite:true,input:{
    postId,revision:2,scheduledAt:'2020-01-15T09:00:00+01:00',idempotencyKey:'schedule-demo-1',
  }}), /future/i);
});
