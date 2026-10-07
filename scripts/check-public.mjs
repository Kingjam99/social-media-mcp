const endpoint = 'https://api.publinio.com/mcp';
const checks = [
  ['MCP page', 'https://www.publinio.com/developers/mcp/'],
  ['OAuth resource metadata', 'https://api.publinio.com/.well-known/oauth-protected-resource/mcp'],
  ['OAuth server metadata', 'https://api.publinio.com/.well-known/oauth-authorization-server'],
];
for (const [name, url] of checks) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(name + ' returned HTTP ' + response.status);
  if (name === 'OAuth resource metadata') {
    const metadata = await response.json();
    if (metadata.resource !== endpoint || !metadata.authorization_servers?.includes('https://api.publinio.com')) throw new Error('Unexpected OAuth resource metadata.');
  } else if (name === 'OAuth server metadata') {
    const metadata = await response.json();
    if (metadata.issuer !== 'https://api.publinio.com' || !metadata.client_id_metadata_document_supported ||
        !metadata.code_challenge_methods_supported?.includes('S256')) throw new Error('Expected OAuth PKCE/client-metadata support was not advertised.');
  }
  console.log(name + ': HTTP ' + response.status);
}
console.log('Public HTTP/discovery checks passed. No authentication or tool execution performed.');
