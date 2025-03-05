import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt-ts";
import { getUser } from "@/app/db";
import { authConfig } from "./auth.config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize({ email, password }: any) {
        try {
          let user = await getUser(email);
          
          // If environment is not fully set up (e.g. no database connection),
          // allow a test user to log in for development purposes
          if (process.env.NODE_ENV === 'development' && !process.env.SUPABASE_DB_URL) {
            if (email === 'test@example.com' && password === 'password') {
              console.log('Using test user for development');
              return {
                id: '1',
                email: 'test@example.com',
                name: 'Test User'
              };
            }
          }
          
          if (user.length === 0) return null;
          
          let passwordsMatch = await compare(password, user[0].password!);
          if (passwordsMatch) return user[0] as any;
          
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
});
