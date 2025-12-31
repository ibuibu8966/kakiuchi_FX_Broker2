import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        // 設定取得は認証不要（ウォレットアドレスは顧客も見る必要があるため）
        const settings = await prisma.systemSettings.findFirst()

        return NextResponse.json({
            settings: settings ? {
                spread: settings.spreadMarkup,
                commission: Number(settings.commissionPerLot),
                losscut_level: settings.liquidationLevel,
                swapBuy: settings.swapBuy,
                swapSell: settings.swapSell,
                depositWalletAddress: settings.depositWalletAddress,
                depositQrImageUrl: settings.depositQrImageUrl,
            } : null,
        })
    } catch (error) {
        console.error("Get settings error:", error)
        return NextResponse.json(
            { error: "設定の取得に失敗しました" },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const body = await request.json()
        const { spread, commission, losscut_level, swapBuy, swapSell, depositWalletAddress, depositQrImageUrl } = body

        // 既存設定を取得または作成
        const existingSettings = await prisma.systemSettings.findFirst()

        if (existingSettings) {
            await prisma.systemSettings.update({
                where: { id: existingSettings.id },
                data: {
                    spreadMarkup: spread,
                    commissionPerLot: BigInt(commission),
                    liquidationLevel: losscut_level,
                    swapBuy: swapBuy ?? 0,
                    swapSell: swapSell ?? 0,
                    depositWalletAddress: depositWalletAddress || null,
                    depositQrImageUrl: depositQrImageUrl || null,
                },
            })
        } else {
            await prisma.systemSettings.create({
                data: {
                    spreadMarkup: spread,
                    commissionPerLot: BigInt(commission),
                    liquidationLevel: losscut_level,
                    swapBuy: swapBuy ?? 0,
                    swapSell: swapSell ?? 0,
                    depositWalletAddress: depositWalletAddress || null,
                    depositQrImageUrl: depositQrImageUrl || null,
                },
            })
        }

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "SETTINGS_UPDATED",
                entityType: "SystemSettings",
                entityId: existingSettings?.id || "new",
                newValue: { spread, commission, losscut_level, swapBuy, swapSell, depositWalletAddress },
            },
        })

        return NextResponse.json({ message: "設定を保存しました" })
    } catch (error) {
        console.error("Save settings error:", error)
        return NextResponse.json(
            { error: "設定の保存に失敗しました" },
            { status: 500 }
        )
    }
}

