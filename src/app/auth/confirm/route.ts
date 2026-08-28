import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function authErrorRedirect(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', 'We could not confirm that email link. Request a new confirmation email and try again.');
  return url;
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.redirect(authErrorRedirect(request));

  const destination = new URL('/profile', request.url);
  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const result = tokenHash && type === 'email'
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
    : { error: new Error('Missing confirmation token') };

  return result.error ? NextResponse.redirect(authErrorRedirect(request)) : response;
}
