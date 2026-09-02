import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const PRESET_USERS: Record<string, { id: string; name: string; email: string; role: string }> = {
  'member@fms.com': { id: 'usr-member-1', name: 'Juan Dela Cruz', email: 'member@fms.com', role: 'member' },
  'maria@fms.com': { id: 'usr-member-2', name: 'Maria Clara', email: 'maria@fms.com', role: 'member' },
  'treasurer@fms.com': { id: 'usr-treasurer-1', name: 'Maria Santos', email: 'treasurer@fms.com', role: 'treasurer' },
  'admin@fms.com': { id: 'usr-admin-1', name: 'Admin Officer', email: 'admin@fms.com', role: 'admin' },
  'auditor@fms.com': { id: 'usr-auditor-1', name: 'Audit Inspector', email: 'auditor@fms.com', role: 'auditor' },
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const rawInput = (credentials?.email || '').trim().toLowerCase();

        // 1. Direct match by email
        if (PRESET_USERS[rawInput]) {
          return PRESET_USERS[rawInput];
        }

        // 2. Keyword matching for easy dev testing
        if (rawInput.includes('treasurer')) {
          return PRESET_USERS['treasurer@fms.com'];
        }
        if (rawInput.includes('admin') || rawInput.includes('officer')) {
          return PRESET_USERS['admin@fms.com'];
        }
        if (rawInput.includes('auditor')) {
          return PRESET_USERS['auditor@fms.com'];
        }
        if (rawInput.includes('maria') || rawInput.includes('clara')) {
          return PRESET_USERS['maria@fms.com'];
        }
        if (rawInput.includes('member') || rawInput.includes('juan')) {
          return PRESET_USERS['member@fms.com'];
        }

        // 3. Fallback default
        return {
          id: 'usr-member-1',
          name: rawInput || 'Juan Dela Cruz',
          email: rawInput.includes('@') ? rawInput : `${rawInput || 'member'}@fms.com`,
          role: 'member',
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role || 'member';
        (session.user as any).id = token.sub || 'usr-member-1';
        (session.user as any).name = token.name || session.user.name;
        (session.user as any).email = token.email || session.user.email;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'member';
        token.sub = (user as any).id || 'usr-member-1';
        token.name = user.name;
        token.email = user.email;
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
