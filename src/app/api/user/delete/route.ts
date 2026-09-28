import { NextRequest, NextResponse } from 'next/server';

// Cookie names used by next-auth v5
const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
];

export async function DELETE(req: NextRequest) {
  const { userId } = await req.json().catch(() => ({}));

  // Build a response that expires every auth cookie immediately
  const res = NextResponse.json({ ok: true });

  for (const name of AUTH_COOKIE_NAMES) {
    res.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  // Also clear __Secure- variants on the root path
  for (const name of AUTH_COOKIE_NAMES) {
    if (!name.startsWith('__Secure-') && !name.startsWith('__Host-')) {
      res.cookies.set(`__Secure-${name}`, '', {
        maxAge: 0,
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      });
    }
  }

  return res;
}
