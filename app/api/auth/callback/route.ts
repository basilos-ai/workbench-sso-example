import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  AUTH_COOKIE_NAMES,
  exchangeAuthorizationCode,
  getAppUrl,
  getCookieOptions,
  secureEqual,
  verifyIdToken,
} from '@/lib/oidc';

export const runtime = 'nodejs';

function finish(response: NextResponse): NextResponse {
  const expired = getCookieOptions(0);
  response.cookies.set(AUTH_COOKIE_NAMES.state, '', expired);
  response.cookies.set(AUTH_COOKIE_NAMES.nonce, '', expired);
  response.cookies.set(AUTH_COOKIE_NAMES.verifier, '', expired);
  return response;
}

function failure(code: string): NextResponse {
  const url = new URL('/', getAppUrl());
  url.searchParams.set('error', code);
  return finish(NextResponse.redirect(url));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnedState = request.nextUrl.searchParams.get('state') ?? '';
  const expectedState =
    request.cookies.get(AUTH_COOKIE_NAMES.state)?.value ?? '';
  if (
    !returnedState ||
    !expectedState ||
    !secureEqual(returnedState, expectedState)
  ) {
    return failure('invalid_state');
  }

  const providerError = request.nextUrl.searchParams.get('error');
  if (providerError) {
    return failure(
      providerError === 'access_denied' ? 'access_denied' : 'authorization',
    );
  }

  const code = request.nextUrl.searchParams.get('code') ?? '';
  const nonce = request.cookies.get(AUTH_COOKIE_NAMES.nonce)?.value ?? '';
  const verifier = request.cookies.get(AUTH_COOKIE_NAMES.verifier)?.value ?? '';
  if (!code || !nonce || !verifier) return failure('invalid_callback');

  try {
    const token = await exchangeAuthorizationCode(code, verifier);
    await verifyIdToken(token.idToken, nonce);
    const response = finish(NextResponse.redirect(getAppUrl()));
    response.cookies.set(
      AUTH_COOKIE_NAMES.session,
      token.idToken,
      getCookieOptions(Math.min(token.expiresIn, 300)),
    );
    return response;
  } catch {
    return failure('token_exchange');
  }
}
