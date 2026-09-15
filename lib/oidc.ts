import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAMES = {
  // ponytail: 示例只保留一个浏览器授权尝试；需要并行多标签时改为按 flow ID 存储。
  state: 'workbench_oidc_state',
  nonce: 'workbench_oidc_nonce',
  verifier: 'workbench_oidc_verifier',
  session: 'workbench_oidc_session',
} as const;

type OidcMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

type TokenResponse = {
  id_token?: unknown;
  expires_in?: unknown;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + ' is required');
  return value;
}

function httpUrl(value: string, name: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(name + ' must use HTTP or HTTPS');
  }
  return url;
}

export function getAppUrl(): URL {
  return httpUrl(requiredEnv('APP_URL'), 'APP_URL');
}

function getClientId(): string {
  return requiredEnv('OIDC_CLIENT_ID');
}

export function getCookieOptions(maxAge: number) {
  const secure = getAppUrl().protocol === 'https:';
  return {
    httpOnly: true,
    sameSite: secure ? ('none' as const) : ('lax' as const),
    secure,
    ...(secure ? { partitioned: true } : {}),
    path: '/',
    maxAge,
  };
}

export function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function getOidcMetadata(): Promise<OidcMetadata> {
  const configuredIssuer = httpUrl(
    requiredEnv('WORKBENCH_ISSUER'),
    'WORKBENCH_ISSUER',
  )
    .toString()
    .replace(/\/$/, '');
  const response = await fetch(
    configuredIssuer + '/.well-known/openid-configuration',
    { cache: 'no-store', signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) {
    throw new Error('Workbench discovery failed with HTTP ' + response.status);
  }

  const metadata = (await response.json()) as Partial<OidcMetadata>;
  if (
    typeof metadata.issuer !== 'string' ||
    metadata.issuer.replace(/\/$/, '') !== configuredIssuer ||
    typeof metadata.authorization_endpoint !== 'string' ||
    typeof metadata.token_endpoint !== 'string' ||
    typeof metadata.jwks_uri !== 'string'
  ) {
    throw new Error('Workbench discovery response is invalid');
  }
  httpUrl(metadata.authorization_endpoint, 'authorization_endpoint');
  httpUrl(metadata.token_endpoint, 'token_endpoint');
  httpUrl(metadata.jwks_uri, 'jwks_uri');
  return metadata as OidcMetadata;
}

export async function createAuthorizationRequest(): Promise<{
  url: URL;
  state: string;
  nonce: string;
  verifier: string;
}> {
  const metadata = await getOidcMetadata();
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set('client_id', getClientId());
  url.searchParams.set(
    'redirect_uri',
    new URL('/api/auth/callback', getAppUrl()).toString(),
  );
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { url, state, nonce, verifier };
}

export async function exchangeAuthorizationCode(
  code: string,
  verifier: string,
): Promise<{ idToken: string; expiresIn: number }> {
  const metadata = await getOidcMetadata();
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getClientId(),
      client_secret: requiredEnv('OIDC_CLIENT_SECRET'),
      redirect_uri: new URL('/api/auth/callback', getAppUrl()).toString(),
      code,
      code_verifier: verifier,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const body = (await response.json()) as TokenResponse;
  if (!response.ok || typeof body.id_token !== 'string') {
    throw new Error('Workbench token exchange failed');
  }
  return {
    idToken: body.id_token,
    expiresIn:
      typeof body.expires_in === 'number' &&
      Number.isFinite(body.expires_in) &&
      body.expires_in > 0
        ? Math.floor(body.expires_in)
        : 300,
  };
}

export async function verifyIdToken(
  idToken: string,
  expectedNonce?: string,
): Promise<JWTPayload> {
  const metadata = await getOidcMetadata();
  const { payload } = await jwtVerify(
    idToken,
    createRemoteJWKSet(new URL(metadata.jwks_uri), {
      timeoutDuration: 5000,
    }),
    {
      issuer: metadata.issuer,
      audience: getClientId(),
      algorithms: ['RS256'],
      clockTolerance: 5,
    },
  );
  if (
    expectedNonce !== undefined &&
    (typeof payload.nonce !== 'string' ||
      !secureEqual(payload.nonce, expectedNonce))
  ) {
    throw new Error('OIDC nonce mismatch');
  }
  return payload;
}

export async function readSession(): Promise<JWTPayload | null> {
  const idToken = (await cookies()).get(AUTH_COOKIE_NAMES.session)?.value;
  if (!idToken) return null;
  try {
    return await verifyIdToken(idToken);
  } catch {
    return null;
  }
}
