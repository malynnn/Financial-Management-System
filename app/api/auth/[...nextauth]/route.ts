import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const PRESET_USERS: Record<string, { id: string; name: string; email: string; role: string }> = {
  // Configured roles: Collecting Officer, Disbursing Officer, Auditor, System Admin
  'collecting.officer@fms.com': { id: 'usr-co-1', name: 'Maria Santos', email: 'collecting.officer@fms.com', role: 'collecting_officer' },
  'disbursing.officer@fms.com': { id: 'usr-do-1', name: 'Jose Reyes', email: 'disbursing.officer@fms.com', role: 'disbursing_officer' },
  'admin@fms.com': { id: 'usr-admin-1', name: 'System Administrator', email: 'admin@fms.com', role: 'admin' },
  'auditor@fms.com': { id: 'usr-auditor-1', name: 'Audit Inspector', email: 'auditor@fms.com', role: 'auditor' },
  // Backward compatibility alias for collecting officer
  'treasurer@fms.com': { id: 'usr-co-1', name: 'Maria Santos', email: 'collecting.officer@fms.com', role: 'collecting_officer' },
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
        if (rawInput.includes('collecting') || rawInput.includes('treasurer')) {
          return PRESET_USERS['collecting.officer@fms.com'];
        }
        if (rawInput.includes('disbursing') || rawInput.includes('disbursement')) {
          return PRESET_USERS['disbursing.officer@fms.com'];
        }
        if (rawInput.includes('admin') || rawInput.includes('system')) {
          return PRESET_USERS['admin@fms.com'];
        }
        if (rawInput.includes('auditor')) {
          return PRESET_USERS['auditor@fms.com'];
        }

        // 3. Fallback default to Collecting Officer
        return PRESET_USERS['collecting.officer@fms.com'];
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role || 'collecting_officer';
        (session.user as any).id = token.sub || 'usr-co-1';
        (session.user as any).name = token.name || session.user.name;
        (session.user as any).email = token.email || session.user.email;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'collecting_officer';
        token.sub = (user as any).id || 'usr-co-1';
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
