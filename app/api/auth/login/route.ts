import { NextResponse } from 'next/server';

import {
  AUTH_COOKIE_NAMES,
  createAuthorizationRequest,
  getAppUrl,
  getCookieOptions,
} from '@/lib/oidc';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const authorization = await createAuthorizationRequest();
    const response = NextResponse.redirect(authorization.url);
    const options = getCookieOptions(600);
    response.cookies.set(AUTH_COOKIE_NAMES.state, authorization.state, options);
    response.cookies.set(AUTH_COOKIE_NAMES.nonce, authorization.nonce, options);
    response.cookies.set(
      AUTH_COOKIE_NAMES.verifier,
      authorization.verifier,
      options,
    );
    return response;
  } catch {
    const url = new URL('/', getAppUrl());
    url.searchParams.set('error', 'configuration');
    return NextResponse.redirect(url);
  }
}
