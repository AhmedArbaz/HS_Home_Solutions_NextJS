import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabaseEnv } from '@/lib/supabase/env';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loginPath = pathname.startsWith('/seller')
    ? '/seller/login'
    : pathname.startsWith('/account')
      ? '/account/login'
      : '/admin/login';
  const isLogin = ['/admin/login', '/seller/login', '/seller/register', '/account/login', '/account/register'].some((p) =>
    pathname.startsWith(p),
  );

  if (!hasSupabaseEnv) {
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session cookie and tells us whether someone is logged in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/seller/:path*', '/account/:path*'] };
