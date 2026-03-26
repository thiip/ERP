import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "@/types/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            companyAccess: {
              include: { company: true },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        const companyIds = user.companyAccess.map((ca) => ca.companyId);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyIds,
          activeCompanyId: companyIds[0] || "",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as unknown as SessionUser;
        token.id = u.id;
        token.role = u.role;
        token.companyIds = u.companyIds;
        token.activeCompanyId = u.activeCompanyId;
      }
      if (trigger === "update" && session?.activeCompanyId) {
        token.activeCompanyId = session.activeCompanyId;
      }
      return token;
    },
    async session({ session, token }) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const s = session as any;
      s.user = {
        id: token.id,
        name: token.name || "",
        email: token.email || "",
        role: token.role,
        companyIds: token.companyIds,
        activeCompanyId: token.activeCompanyId,
      };
      return s;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
