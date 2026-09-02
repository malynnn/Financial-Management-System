import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        return {
          id: 'usr-1',
          name: 'Angel Colinares',
          email: credentials?.email || 'treasurer@fms.com',
          role: 'treasurer',
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role || 'treasurer';
        (session.user as any).id = token.sub || 'usr-1';
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'treasurer';
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'change_this_to_a_long_random_secret',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
