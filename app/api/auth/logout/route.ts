import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAMES, getAppUrl, getCookieOptions } from '@/lib/oidc';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.redirect(getAppUrl(), 303);
  response.cookies.set(AUTH_COOKIE_NAMES.session, '', getCookieOptions(0));
  return response;
}
