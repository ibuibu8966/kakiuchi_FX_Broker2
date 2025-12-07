import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const body = await request.json()
        const { userId, reason } = body

        if (!userId) {
            return NextResponse.json({ error: "ユーザーIDが必要です" }, { status: 400 })
        }

        if (!reason) {
            return NextResponse.json({ error: "却下理由を入力してください" }, { status: 400 })
        }

        // ユーザーのKYCを却下
        await prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: "REJECTED",
                kycRejectedReason: reason,
            },
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "KYC_REJECTED",
                entityType: "User",
                entityId: userId,
                newValue: { rejectedBy: session.user.id, reason },
            },
        })

        return NextResponse.json({ message: "KYCを却下しました" })
    } catch (error) {
        console.error("KYC reject error:", error)
        return NextResponse.json(
            { error: "却下処理に失敗しました" },
            { status: 500 }
        )
    }
}
