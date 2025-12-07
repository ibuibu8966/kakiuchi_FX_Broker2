import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                kycStatus: true,
                kycRejectedReason: true,
                postalCode: true,
                prefecture: true,
                city: true,
                address1: true,
                address2: true,
                idDocumentType: true,
                idDocumentUrl: true,
                addressDocumentType: true,
                addressDocumentUrl: true,
            },
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error("Get KYC error:", error)
        return NextResponse.json(
            { error: "KYC情報の取得に失敗しました" },
            { status: 500 }
        )
    }
}
