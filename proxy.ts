import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAuthorizedAdmin } from "@/lib/supabase/server";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Login page reste accessible sans session
  if (path === "/admin/login") {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si Supabase n'est pas configuré, on laisse la page admin afficher son
  // propre message d'instruction au lieu de planter.
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (!isAuthorizedAdmin(user.email)) {
    // Email connecté mais hors allowlist : on déconnecte et on renvoie au login.
    await supabase.auth.signOut();
    const redirectUrl = new URL("/admin/login", request.url);
    redirectUrl.searchParams.set("error", "unauthorized");
    const redirect = NextResponse.redirect(redirectUrl);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
