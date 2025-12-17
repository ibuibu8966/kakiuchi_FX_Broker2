import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { txHash } = body

        if (!txHash) {
            return NextResponse.json({ error: "トランザクションIDが必要です" }, { status: 400 })
        }

        // 自分のトランザクションか確認
        const transaction = await prisma.transaction.findFirst({
            where: { id },
            include: { account: true }
        })

        if (!transaction) {
            return NextResponse.json({ error: "取引が見つかりません" }, { status: 404 })
        }

        if (transaction.account.userId !== session.user.id) {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        // トランザクションハッシュを更新
        await prisma.transaction.update({
            where: { id },
            data: { txHash }
        })

        return NextResponse.json({ message: "トランザクションIDを更新しました" })
    } catch (error) {
        console.error("Update transaction error:", error)
        return NextResponse.json(
            { error: "更新に失敗しました" },
            { status: 500 }
        )
    }
}
