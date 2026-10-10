// TAATVA Obsidian - the gatekeeper. Runs before every page opens.
// Not signed in? You are sent to the sign-in page. Already signed in? The
// sign-in page sends you to Scan. It also keeps the sign-in fresh.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const onLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !onLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (user && onLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/scan";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

// Check every page, but not pictures, fonts and other files
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
