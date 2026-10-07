import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { MCP_URL, startCallback, MemoryOAuthProvider, newState, publinioFetch } from './oauth.mjs';

/** Authentication is interactive; no API key or permanent token file is needed. */
export async function connectPublinio(scopes, onAuthUrl = url =>
  console.error('Open this Publinio authorization URL in your browser:\n' + url)) {
  const state = newState();
  const callback = await startCallback({ state, port: 8347 });
  const provider = new MemoryOAuthProvider(callback.redirectUrl, scopes, state, onAuthUrl);
  provider.clientMetadataUrl = 'https://raw.githubusercontent.com/Kingjam99/social-media-mcp/main/config/client-metadata.json';
  let client, transport;
  const connect = async () => {
    client = new Client({ name: 'publinio-social-media-mcp-examples', version: '0.1.0' });
    transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      authProvider: provider,
      fetch: publinioFetch,
    });
    await client.connect(transport);
  };
  try {
    const options = { serverUrl: MCP_URL, scope: scopes.join(' '), fetchFn: publinioFetch };
    const status = await auth(provider, options);
    if (status === 'REDIRECT') {
      await auth(provider, { ...options, authorizationCode: await callback.code });
    }
    await connect();
    return client;
  } catch {
    await client?.close().catch(() => {});
    throw new Error('Could not connect to Publinio. Check authorization, network access, and docs/troubleshooting.md.');
  } finally {
    await callback.close();
  }
}
