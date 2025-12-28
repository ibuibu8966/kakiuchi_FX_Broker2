import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const settings = await prisma.systemSettings.findFirst({
            select: {
                depositQrCodeUrl: true,
                depositWalletAddress: true,
            },
        })

        return NextResponse.json({
            qrCodeUrl: settings?.depositQrCodeUrl || null,
            walletAddress: settings?.depositWalletAddress || null,
        })
    } catch (error) {
        console.error("Get deposit info error:", error)
        return NextResponse.json(
            { error: "入金情報の取得に失敗しました" },
            { status: 500 }
        )
    }
}
