import { auth } from "./auth";
import { NextResponse } from "next/server";

// Auth protection is handled client-side to support both
// custom (localStorage) and Google OAuth (next-auth) sessions.
// Middleware is kept for next-auth session handling only.
export default auth(() => {
  return NextResponse.next();
});

export const config = {
  matcher: ["/api/auth/:path*"],
};
