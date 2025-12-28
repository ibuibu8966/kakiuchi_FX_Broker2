import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const users = await prisma.user.findMany({
            orderBy: { name: "asc" },
            include: {
                accounts: {
                    select: {
                        accountNumber: true,
                    },
                },
            },
        })

        const formattedUsers = users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            accountNumber: user.accounts[0]?.accountNumber || "---",
        }))

        return NextResponse.json({ users: formattedUsers })
    } catch (error) {
        console.error("Get users error:", error)
        return NextResponse.json(
            { error: "ユーザー一覧の取得に失敗しました" },
            { status: 500 }
        )
    }
}
