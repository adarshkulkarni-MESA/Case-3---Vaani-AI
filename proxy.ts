import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function proxy(req: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const { pathname } = req.nextUrl;

  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export { proxy };
export default proxy;

export const config = {
  matcher: ["/((?!api/webhooks|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
