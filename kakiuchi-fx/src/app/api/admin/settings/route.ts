import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const settings = await prisma.systemSettings.findFirst()

        return NextResponse.json({
            settings: settings ? {
                spread: settings.spreadMarkup,
                commission: Number(settings.commissionPerLot),
                losscut_level: settings.liquidationLevel,
                swap_rate_buy: Number(settings.swapRateBuy),
                swap_rate_sell: Number(settings.swapRateSell),
                swap_calculation_hour: settings.swapCalculationHour,
                deposit_qr_code_url: settings.depositQrCodeUrl,
                deposit_wallet_address: settings.depositWalletAddress,
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
        const { spread, commission, losscut_level, swap_rate_buy, swap_rate_sell, swap_calculation_hour, deposit_wallet_address } = body

        // 既存設定を取得または作成
        const existingSettings = await prisma.systemSettings.findFirst()

        if (existingSettings) {
            await prisma.systemSettings.update({
                where: { id: existingSettings.id },
                data: {
                    spreadMarkup: spread,
                    commissionPerLot: BigInt(commission),
                    liquidationLevel: losscut_level,
                    swapRateBuy: BigInt(swap_rate_buy ?? 0),
                    swapRateSell: BigInt(swap_rate_sell ?? 0),
                    swapCalculationHour: swap_calculation_hour ?? 7,
                    depositWalletAddress: deposit_wallet_address ?? undefined,
                },
            })
        } else {
            await prisma.systemSettings.create({
                data: {
                    spreadMarkup: spread,
                    commissionPerLot: BigInt(commission),
                    liquidationLevel: losscut_level,
                    swapRateBuy: BigInt(swap_rate_buy ?? 0),
                    swapRateSell: BigInt(swap_rate_sell ?? 0),
                    swapCalculationHour: swap_calculation_hour ?? 7,
                    depositWalletAddress: deposit_wallet_address ?? undefined,
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
                newValue: { spread, commission, losscut_level, swap_rate_buy, swap_rate_sell, swap_calculation_hour, deposit_wallet_address },
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
