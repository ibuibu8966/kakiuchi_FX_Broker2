import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IdDocumentType, AddressDocumentType } from "@prisma/client"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const body = await request.json()
        const { idDocumentType, addressDocumentType } = body

        if (!idDocumentType || !addressDocumentType) {
            return NextResponse.json(
                { error: "書類の種類を選択してください" },
                { status: 400 }
            )
        }

        // ステータス確認
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        })

        if (user?.kycStatus === "SUBMITTED") {
            return NextResponse.json(
                { error: "既に申請中です" },
                { status: 400 }
            )
        }

        if (user?.kycStatus === "VERIFIED") {
            return NextResponse.json(
                { error: "既に承認されています" },
                { status: 400 }
            )
        }

        // 住所が入力されているか確認
        if (!user?.postalCode || !user?.prefecture || !user?.city || !user?.address1) {
            return NextResponse.json(
                { error: "先に住所を入力してください" },
                { status: 400 }
            )
        }

        // KYC申請
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                idDocumentType: idDocumentType as IdDocumentType,
                addressDocumentType: addressDocumentType as AddressDocumentType,
                kycStatus: "SUBMITTED",
                kycSubmittedAt: new Date(),
                kycRejectedReason: null, // 再申請の場合はクリア
            },
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "KYC_SUBMITTED",
                entityType: "User",
                entityId: session.user.id,
                newValue: { idDocumentType, addressDocumentType },
            },
        })

        return NextResponse.json({ message: "KYC申請を受け付けました" })
    } catch (error) {
        console.error("KYC submit error:", error)
        return NextResponse.json(
            { error: "KYC申請に失敗しました" },
            { status: 500 }
        )
    }
}
