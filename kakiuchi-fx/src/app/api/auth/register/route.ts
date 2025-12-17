import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { generateAccountNumber } from "@/lib/utils"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, password } = body

        // バリデーション
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "すべての項目を入力してください" },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "パスワードは8文字以上で入力してください" },
                { status: 400 }
            )
        }

        // メールアドレス重複チェック
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "このメールアドレスは既に登録されています" },
                { status: 400 }
            )
        }

        // パスワードハッシュ化
        const passwordHash = await bcrypt.hash(password, 12)

        // ユーザー作成
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
            },
        })

        // 口座を自動作成（KYC後にアクティブ化）
        await prisma.account.create({
            data: {
                userId: user.id,
                accountNumber: generateAccountNumber(),
                leverage: 200, // デフォルト200倍
            },
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "USER_REGISTERED",
                entityType: "User",
                entityId: user.id,
            },
        })

        return NextResponse.json(
            { message: "登録が完了しました", userId: user.id },
            { status: 201 }
        )
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "登録中にエラーが発生しました" },
            { status: 500 }
        )
    }
}
