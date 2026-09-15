import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAMES, getOidcMetadata } from '@/lib/oidc';
import { API_SCOPE_TESTS, type ApiScope } from '@/lib/scope-tests';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAMES.accessToken)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'missing_access_token' }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    scope?: unknown;
  } | null;
  const test = API_SCOPE_TESTS.find(
    (item) => item.scope === (input?.scope as ApiScope),
  );
  if (!test) {
    return NextResponse.json({ error: 'invalid_scope' }, { status: 400 });
  }

  try {
    const metadata = await getOidcMetadata();
    const response = await fetch(new URL(test.path, metadata.issuer), {
      method: test.method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...('probe' in test ? { 'content-type': 'application/json' } : {}),
      },
      ...('probe' in test ? { body: '{}' } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const body = (await response.text()).slice(0, 2000);
    return NextResponse.json({
      scope: test.scope,
      status: response.status,
      authorized: response.status !== 401 && response.status !== 403,
      body,
    });
  } catch {
    return NextResponse.json({ error: 'workbench_unavailable' }, { status: 502 });
  }
}
