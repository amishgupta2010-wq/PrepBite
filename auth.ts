// Disable TLS certificate verification for LOCAL development only
// (needed when network SSL interception is present on dev machines)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow sign-out redirects to go to "/" (or wherever specified)
      if (url === '/' || url === baseUrl || url === `${baseUrl}/`) return '/';
      // For OAuth sign-in, always land on auth-callback
      return `${baseUrl}/auth-callback`;
    },
  },
  trustHost: true,
});
