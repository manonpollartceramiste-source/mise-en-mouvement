import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAuthorizedAdmin } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Cabinet OS (/os/*) ───────────────────────────────────
  if (pathname.startsWith("/os")) {
    if (pathname === "/os/login" || pathname === "/os/login/") {
      return NextResponse.next();
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

    let osResponse = NextResponse.next({
      request: { headers: request.headers },
    });

    const osClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          osResponse = NextResponse.next({ request: { headers: request.headers } });
          for (const { name, value, options } of cookiesToSet) {
            osResponse.cookies.set(name, value, options);
          }
        },
      },
    });

    const {
      data: { user: osUser },
    } = await osClient.auth.getUser();

    if (!osUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/os/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 1. get_my_profile() est security definer — bypasse RLS entièrement
    let profile: { role: string; active: boolean } | null = null;

    const { data: rpcRaw, error: rpcErr } = await osClient.rpc("get_my_profile");
    if (!rpcErr && rpcRaw !== null && rpcRaw !== undefined) {
      const raw = Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw;
      if (raw && typeof raw === "object" && "role" in raw) {
        profile = raw as { role: string; active: boolean };
      }
    }
    console.log(
      "[proxy] from:", pathname,
      "uid:", osUser.id.slice(0, 8),
      "rpc →", profile ? `role=${profile.role} active=${profile.active}` : "null",
      rpcErr ? "| rpcErr:" + rpcErr.message : "",
    );

    // 2. Fallback : requête directe si le RPC échoue ou retourne null
    let dbError = false;
    if (!profile) {
      const { data: directData, error: directErr } = await osClient
        .from("profiles")
        .select("role, active")
        .eq("id", osUser.id)
        .maybeSingle();
      console.log(
        "[proxy] direct →", JSON.stringify(directData),
        directErr ? "| directErr:" + directErr.message : "",
      );
      if (directErr) {
        dbError = true;
      } else {
        profile = directData;
      }
    }

    // 3. Si les deux requêtes échouent sur erreur DB (pas "profil absent"),
    //    laisser passer plutôt que de boucler sur /os/login
    if (!profile && dbError) {
      console.log("[proxy] DB error for authenticated user — passthrough to page");
      return osResponse;
    }

    if (!profile || !profile.active) {
      console.log("[proxy] → /os/login?error=unauthorized (no active profile)");
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/os/login";
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    const role = profile.role as string;
    const isAdmin  = role === "admin";
    const isCoach  = role === "coach" || role === "admin";
    const isClient = role === "client" || role === "admin";
    const bestRedirect = isCoach ? "/os/coach" : "/os/client";

    console.log(
      "[proxy] role:", role,
      "isCoach:", isCoach, "isAdmin:", isAdmin,
      "→ path:", pathname,
    );

    if (pathname.startsWith("/os/admin") && !isAdmin) {
      console.log("[proxy] → not admin, redirect to", bestRedirect);
      return NextResponse.redirect(new URL(bestRedirect, request.url));
    }
    if (pathname.startsWith("/os/coach") && !isCoach) {
      console.log("[proxy] → not coach, redirect to", bestRedirect);
      return NextResponse.redirect(new URL(bestRedirect, request.url));
    }
    if (pathname.startsWith("/os/client") && !isClient) {
      console.log("[proxy] → not client, redirect to", bestRedirect);
      return NextResponse.redirect(new URL(bestRedirect, request.url));
    }
    if (pathname === "/os" || pathname === "/os/") {
      return NextResponse.redirect(new URL(bestRedirect, request.url));
    }

    return osResponse;
  }

  // ── Admin site (/admin/*) ────────────────────────────────
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$)os.*)",
  ],
};
