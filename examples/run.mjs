import { parseArgs } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { connectPublinio } from './lib/client.mjs';
import { makePlan, runPlan } from './lib/workflows.mjs';

const help = [
  'Publinio Social Media MCP examples (Node.js 22+)',
  '',
  'node examples/run.mjs discover',
  'node examples/run.mjs analytics --brand YOUR_BRAND_ID --since 2026-10-01 --until 2026-10-07',
  'node examples/run.mjs draft --input draft.local.json --confirm-write',
  'node examples/run.mjs schedule --input schedule.local.json --confirm-write',
  '',
  'X scheduling also requires --confirm-credits after reviewing its price in Publinio.',
  'A browser sign-in is required on each run. Tokens stay in memory.',
  'Input templates and workflow instructions: examples/README.md',
].join('\n');

let client;
try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      brand: { type: 'string' },
      since: { type: 'string' },
      until: { type: 'string' },
      input: { type: 'string' },
      'confirm-write': { type: 'boolean' },
      'confirm-credits': { type: 'boolean' },
    },
  });
  if (values.help || !positionals.length) console.log(help);
  else {
    if (positionals.length !== 1) throw new Error('Choose one example. Use --help for commands.');
    const command = positionals[0];
    let input = {};
    if (command === 'analytics') input = { brandId: values.brand, since: values.since, until: values.until };
    if (command === 'draft' || command === 'schedule') {
      if (!values.input) throw new Error('Provide --input with a reviewed local JSON file.');
      if ((await stat(values.input)).size > 65_536) throw new Error('Input file exceeds 64 KiB.');
      input = JSON.parse(await readFile(values.input, 'utf8'));
    } else if (values.input) throw new Error('--input applies to draft and schedule.');
    const plan = makePlan(command, {
      input, confirmWrite: values['confirm-write'], confirmCredits: values['confirm-credits'],
    });
    client = await connectPublinio(plan.scopes);
    const result = await runPlan(client, plan);
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  // Never expose SDK exceptions, authorization responses or file contents.
  const message = error instanceof SyntaxError ? 'Invalid command or JSON input. Use --help.' : error.message;
  console.error(message);
  process.exitCode = 1;
} finally {
  await client?.close();
}
