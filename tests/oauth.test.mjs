import test from 'node:test';
import assert from 'node:assert/strict';
import { startCallback, MemoryOAuthProvider, publinioFetch, MCP_URL } from '../examples/lib/oauth.mjs';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { createHash } from 'node:crypto';

test('OAuth callback rejects a wrong state and accepts the legitimate callback', async () => {
  const callback = await startCallback({ state: 'legitimate-state', timeoutMs: 2000 });
  try {
    const wrong = await fetch(callback.redirectUrl + '?code=demo-code&state=wrong-state');
    assert.equal(wrong.status, 400);
    const valid = await fetch(callback.redirectUrl + '?code=demo-code&state=legitimate-state');
    assert.equal(valid.status, 200);
    assert.equal(await callback.code, 'demo-code');
    assert.match(await valid.text(), /return to your terminal/i);
  } finally {
    await callback.close();
  }
});

test('a callback cannot replay a consumed authorization state', async () => {
  const callback = await startCallback({state:'single-use-state',timeoutMs:2000});
  try {
    const url = callback.redirectUrl + '?code=demo-code&state=single-use-state';
    assert.equal((await fetch(url)).status, 200);
    await callback.code;
    assert.equal((await fetch(url)).status, 400);
  } finally { await callback.close(); }
});

test('declining OAuth fails without reflecting provider-controlled text', async () => {
  const callback = await startCallback({state:'declined-state',timeoutMs:2000});
  try {
    const response = await fetch(callback.redirectUrl + '?state=declined-state&error=access_denied&error_description=untrusted-text');
    assert.doesNotMatch(await response.text(), /untrusted-text/);
    await assert.rejects(callback.code, /declined/);
  } finally { await callback.close(); }
});

test('the example refuses cross-origin requests and unexpected consent scopes', async () => {
  await assert.rejects(publinioFetch('https://example.com/private'), /unexpected network/i);
  const provider = new MemoryOAuthProvider('http://127.0.0.1:8347/callback', ['brands:read'], 'demo-state', () => {});
  assert.throws(() => provider.redirectToAuthorization(new URL('https://api.publinio.com/oauth/authorize?scope=brands:read%20posts:write')), /permissions/);
});

test('SDK OAuth uses the selected scope and a valid PKCE exchange', async () => {
  let authorizationUrl;
  const provider = new MemoryOAuthProvider('http://127.0.0.1:8347/callback',
    ['brands:read'], 'sdk-test-state', url => { authorizationUrl = new URL(url); });
  provider.clientMetadataUrl = 'https://raw.githubusercontent.com/Kingjam99/social-media-mcp/main/config/client-metadata.json';
  const fakeAuthorizationServer = async (input, init) => {
    const url = new URL(String(input));
    let data;
    if (url.pathname.includes('oauth-protected-resource')) {
      data = {resource:MCP_URL,authorization_servers:['https://api.publinio.com'],
        scopes_supported:['brands:read','posts:write','intelligence:run']};
    } else if (url.pathname.includes('oauth-authorization-server')) {
      data = {issuer:'https://api.publinio.com',authorization_endpoint:'https://api.publinio.com/oauth/authorize',
        token_endpoint:'https://api.publinio.com/oauth/token',response_types_supported:['code'],
        token_endpoint_auth_methods_supported:['none'],grant_types_supported:['authorization_code','refresh_token'],
        code_challenge_methods_supported:['S256'],client_id_metadata_document_supported:true};
    } else if (url.pathname === '/oauth/token') {
      const params = new URLSearchParams(init.body);
      assert.equal(params.get('code'), 'demo-code');
      assert.equal(createHash('sha256').update(params.get('code_verifier')).digest('base64url'),
        authorizationUrl.searchParams.get('code_challenge'));
      data = {access_token:'demo-access-token',token_type:'Bearer',expires_in:3600,scope:'brands:read'};
    } else throw new Error('Unexpected fixture request.');
    return new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json'}});
  };
  const options = {serverUrl:MCP_URL,scope:'brands:read',fetchFn:fakeAuthorizationServer};
  assert.equal(await auth(provider, options), 'REDIRECT');
  assert.equal(authorizationUrl.searchParams.get('scope'), 'brands:read');
  assert.equal(authorizationUrl.searchParams.get('state'), 'sdk-test-state');
  assert.equal(await auth(provider, {...options,authorizationCode:'demo-code'}), 'AUTHORIZED');
  assert.equal(provider.tokens().scope, 'brands:read');
});
