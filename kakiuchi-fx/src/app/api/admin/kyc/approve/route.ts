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
        const { userId } = body

        if (!userId) {
            return NextResponse.json({ error: "ユーザーIDが必要です" }, { status: 400 })
        }

        // ユーザーのKYCを承認
        await prisma.user.update({
            where: { id: userId },
            data: {
                kycStatus: "VERIFIED",
                kycVerifiedAt: new Date(),
                kycRejectedReason: null,
            },
        })

        // 口座をアクティブ化
        await prisma.account.updateMany({
            where: { userId },
            data: { status: "ACTIVE" },
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "KYC_APPROVED",
                entityType: "User",
                entityId: userId,
                newValue: { approvedBy: session.user.id },
            },
        })

        return NextResponse.json({ message: "KYCを承認しました" })
    } catch (error) {
        console.error("KYC approve error:", error)
        return NextResponse.json(
            { error: "承認処理に失敗しました" },
            { status: 500 }
        )
    }
}
