import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(path = root) {
  const files = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(item.name)) continue;
    const full = resolve(path, item.name);
    if (item.isDirectory()) files.push(...await walk(full));
    else if (item.isFile()) files.push(full);
    else throw new Error('Unexpected symlink or special file.');
  }
  return files;
}
const files = await walk();
let links = 0, scripts = 0;
const secretPatterns = [
  /sk-(?:proj-|live_)[A-Za-z0-9_-]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{35,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:eyJ[A-Za-z0-9_-]{10,}\.){2}[A-Za-z0-9_-]{20,}/,
  /[a-z0-9]{20}\.supabase\.co/,
];
for (const file of files) {
  if (/\.(png|webp|jpg)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  if (secretPatterns.some(pattern => pattern.test(text))) throw new Error('Public-content check failed: ' + file);
  if (/\.(mjs|js)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    if (result.status !== 0) throw new Error('JavaScript syntax failed: ' + file);
    scripts++;
  }
  if (file.endsWith('.md')) {
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const local = resolve(dirname(file), target.split('#')[0]);
      await stat(local).catch(() => { throw new Error('Broken local link: ' + target); });
      links++;
    }
  }
}
const catalogue = JSON.parse(await readFile(resolve(root, 'catalog/tools.json'), 'utf8'));
if (catalogue.tools.length !== 80 || new Set(catalogue.tools.map(tool => tool.name)).size !== 80) throw new Error('Unexpected catalogue inventory.');
const expectedApp = ['approve_campaign','approve_brand_fact','approve_automation_sample','set_automation_delivery'];
const actualApp = catalogue.tools.filter(tool => !tool.visibility.includes('model')).map(tool => tool.name);
if (JSON.stringify(actualApp.sort()) !== JSON.stringify(expectedApp.sort())) throw new Error('Incorrect app-only controls.');
const validator = new AjvJsonSchemaValidator();
for (const tool of catalogue.tools) {
  if (!catalogue.scopes[tool.scope]) throw new Error('Unknown tool scope.');
  validator.getValidator(tool.inputSchema);
  validator.getValidator(tool.outputSchema);
}
const manifest = JSON.parse(await readFile(resolve(root, 'server.json'), 'utf8'));
if (manifest.description.length > 100 || manifest.remotes[0].url !== catalogue.endpoint ||
    manifest.remotes[0].type !== 'streamable-http' || manifest.version !== catalogue.serverVersion) throw new Error('Invalid remote manifest.');
const preview = await stat(resolve(root, 'assets/social-preview.jpg'));
if (preview.size >= 1_000_000) throw new Error('Social preview exceeds 1 MB.');
console.log('Public inventory, 80 input/output schemas, ' + scripts + ' scripts, ' + links + ' local links and artwork checks passed.');
