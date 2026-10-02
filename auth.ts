// Disable TLS certificate verification for LOCAL development only
// (needed when network SSL interception is present on dev machines)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleted = (user as any).onboardingCompleted || false;
        token.hasSeenTutorial = (user as any).hasSeenTutorial || false;
      }
      if (trigger === 'update' && session) {
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session.hasSeenTutorial !== undefined) token.hasSeenTutorial = session.hasSeenTutorial;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).onboardingCompleted = token.onboardingCompleted as boolean;
        (session.user as any).hasSeenTutorial = token.hasSeenTutorial as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url === '/' || url === baseUrl || url === `${baseUrl}/`) return '/';
      return `${baseUrl}/auth-callback`;
    },
  },
  trustHost: true,
});
