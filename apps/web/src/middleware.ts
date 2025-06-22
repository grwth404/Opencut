import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Redirect /editor to /
  if (request.nextUrl.pathname === "/editor") {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: "/editor",
};
