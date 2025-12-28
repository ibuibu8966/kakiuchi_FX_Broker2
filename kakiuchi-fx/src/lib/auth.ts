import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { User as PrismaUser } from "@prisma/client"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email: string
            name: string
            role: "USER" | "ADMIN"
        }
    }

    interface User {
        id: string
        email: string
        name: string
        role: "USER" | "ADMIN"
    }
}

// JWT types are included in next-auth module above

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "メールアドレス", type: "email" },
                password: { label: "パスワード", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("メールアドレスとパスワードを入力してください")
                }

                const email = credentials.email as string
                const password = credentials.password as string

                const user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user) {
                    throw new Error("メールアドレスまたはパスワードが正しくありません")
                }

                if (!user.isActive) {
                    throw new Error("このアカウントは停止されています")
                }

                const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

                if (!isPasswordValid) {
                    throw new Error("メールアドレスまたはパスワードが正しくありません")
                }

                // 最終ログイン日時を非同期で更新（レスポンスを待たない）
                prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                }).catch(console.error)

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
            }
            return token
        },
        async session({ session, token }) {
            session.user.id = token.id as string
            session.user.role = token.role as "USER" | "ADMIN"
            return session
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    trustHost: true,
})
