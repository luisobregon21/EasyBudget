import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  let session = null;
  try {
    session = await auth();
  } catch {
    return NextResponse.next();
  }

  const isLoggedIn = !!session?.user;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
