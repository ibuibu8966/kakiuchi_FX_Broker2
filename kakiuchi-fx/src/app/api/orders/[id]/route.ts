import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE: 待機注文キャンセル
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const { id } = await params

        // 注文取得と所有者確認
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                account: {
                    select: { userId: true }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 })
        }

        if (order.account.userId !== session.user.id) {
            return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 })
        }

        if (order.status !== "PENDING") {
            return NextResponse.json({ error: "この注文はキャンセルできません" }, { status: 400 })
        }

        // 注文をキャンセル
        const cancelledOrder = await prisma.order.update({
            where: { id },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
            }
        })

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "ORDER_CANCELLED",
                entityType: "Order",
                entityId: id,
            }
        })

        return NextResponse.json({
            message: "注文をキャンセルしました",
            orderId: cancelledOrder.id,
        })
    } catch (error) {
        console.error("Order cancel error:", error)
        return NextResponse.json(
            { error: "注文キャンセル中にエラーが発生しました" },
            { status: 500 }
        )
    }
}
