import { type NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/sessions";
const publicRoutes = ["/login"];

export default async function middleware(req: NextRequest) {
  const currentPath = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(currentPath);

  if (isPublicRoute) {
    // Soooo Slow

    const session = await verifySession();
    if (session.isAuth) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const session = await verifySession();

  if (!isPublicRoute && !session.isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|sw.js|manifest.json|workbox-|robots.txt|api).*)",
  ],
};