import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const proxyConfig = {
  matcher: ["/((?!api|_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico).*)"],
};
