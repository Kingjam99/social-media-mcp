import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export const MCP_URL = 'https://api.publinio.com/mcp';
const API_ORIGIN = 'https://api.publinio.com';

function sameState(actual, expected) {
  const left = Buffer.from(actual ?? '');
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** One short-lived callback listener. Authorization codes are never logged or saved. */
export async function startCallback({ state, timeoutMs = 300_000, port = 0 }) {
  if (!state || typeof state !== 'string') throw new Error('An OAuth state is required.');
  let resolveCode, rejectCode, timer, finished = false;
  const code = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  // Non-auth connection errors can close the listener before anyone awaits the callback.
  code.catch(() => {});
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const address = server.address();
    const expectedHost = '127.0.0.1:' + address.port;
    let url;
    try { url = new URL(request.url, 'http://' + expectedHost); }
    catch { response.writeHead(400).end('Invalid callback.'); return; }
    if (request.method !== 'GET' || request.headers.host !== expectedHost ||
        url.pathname !== '/callback' || finished ||
        url.searchParams.getAll('state').length !== 1 ||
        !sameState(url.searchParams.get('state'), state)) {
      response.writeHead(400).end('Invalid callback.');
      return;
    }
    if (url.searchParams.has('error')) {
      finished = true;
      clearTimeout(timer);
      response.writeHead(400).end('Authorization was declined. Return to your terminal.');
      rejectCode(new Error('Authorization was declined.'));
      return;
    }
    const value = url.searchParams.get('code');
    if (!value || value.length > 4096 || url.searchParams.getAll('code').length !== 1) {
      response.writeHead(400).end('Missing authorization code.');
      return;
    }
    finished = true;
    clearTimeout(timer);
    response.writeHead(200).end('Publinio connected. You can return to your terminal.');
    resolveCode(value);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  timer = setTimeout(() => {
    finished = true;
    rejectCode(new Error('Authorization timed out. Run the example again.'));
    server.close();
    server.closeAllConnections();
  }, timeoutMs);
  return {
    code,
    redirectUrl: 'http://127.0.0.1:' + server.address().port + '/callback',
    async close() {
      clearTimeout(timer);
      server.closeAllConnections();
      if (server.listening) await new Promise(resolve => server.close(resolve));
    },
  };
}

/** SDK-compatible OAuth provider: one process, PKCE, no token files or embedded secrets. */
export class MemoryOAuthProvider {
  #client;
  #tokens;
  #verifier;
  constructor(redirectUrl, scope, state, onAuthUrl) {
    this.redirectUrl = redirectUrl;
    this.clientMetadata = {
      client_name: 'Publinio Social Media MCP examples',
      client_uri: 'https://github.com/Kingjam99/social-media-mcp',
      redirect_uris: [redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: scope.join(' '),
    };
    this.oauthState = state;
    this.requestedScopes = [...scope].sort().join(' ');
    this.onAuthUrl = onAuthUrl;
  }
  state() { return this.oauthState; }
  clientInformation() { return this.#client; }
  saveClientInformation(value) { this.#client = value; }
  tokens() { return this.#tokens; }
  saveTokens(value) { this.#tokens = value; }
  saveCodeVerifier(value) { this.#verifier = value; }
  codeVerifier() {
    if (!this.#verifier) throw new Error('OAuth session expired. Run the example again.');
    return this.#verifier;
  }
  redirectToAuthorization(url) {
    if (url.origin !== API_ORIGIN || url.pathname !== '/oauth/authorize') {
      throw new Error('Unexpected authorization destination.');
    }
    const scopes = (url.searchParams.get('scope') ?? '').split(/\s+/).filter(Boolean).sort().join(' ');
    if (scopes !== this.requestedScopes) throw new Error('Unexpected OAuth permissions.');
    this.onAuthUrl(url.toString());
  }
  async validateResourceURL(serverUrl, resource) {
    if (String(serverUrl) !== MCP_URL || (resource && resource !== MCP_URL)) {
      throw new Error('Unexpected OAuth resource.');
    }
    return new URL(MCP_URL);
  }
  invalidateCredentials(kind) {
    if (kind === 'all' || kind === 'client') this.#client = undefined;
    if (kind === 'all' || kind === 'tokens') this.#tokens = undefined;
    if (kind === 'all' || kind === 'verifier') this.#verifier = undefined;
  }
}

export function newState() { return randomBytes(32).toString('hex'); }

/** Keep tokens and SDK discovery requests on Publinio's HTTPS origin. */
export async function publinioFetch(input, init = {}) {
  const target = new URL(input instanceof Request ? input.url : String(input));
  if (target.origin !== API_ORIGIN) throw new Error('Unexpected network destination.');
  const signals = [AbortSignal.timeout(30_000), init.signal,
    input instanceof Request ? input.signal : undefined].filter(Boolean);
  return fetch(input, { ...init, redirect: 'error', signal: AbortSignal.any(signals) });
}
