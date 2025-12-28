import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const { id } = await params

        // ユーザー情報を取得（口座情報含む）
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                accounts: {
                    include: {
                        transactions: {
                            orderBy: { createdAt: "desc" },
                            take: 50,
                        },
                        trades: {
                            orderBy: { executedAt: "desc" },
                            take: 50,
                        },
                        positions: {
                            orderBy: { openedAt: "desc" },
                            take: 20,
                        },
                    },
                },
                chatRooms: {
                    orderBy: { updatedAt: "desc" },
                    take: 10,
                    include: {
                        messages: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                        },
                    },
                },
            },
        })

        if (!user) {
            return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 })
        }

        const account = user.accounts[0]

        // レスポンス用にデータを整形
        const response = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString() || null,
            },
            account: account ? {
                id: account.id,
                accountNumber: account.accountNumber,
                balance: Number(account.balance) / 100,
                equity: Number(account.equity) / 100,
                leverage: account.leverage,
                status: account.status,
            } : null,
            transactions: account?.transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: Number(t.amount) / 100,
                status: t.status,
                createdAt: t.createdAt.toISOString(),
                processedAt: t.processedAt?.toISOString() || null,
                note: t.note,
            })) || [],
            trades: account?.trades.map(t => ({
                id: t.id,
                symbol: t.symbol,
                side: t.side,
                tradeType: t.tradeType,
                quantity: Number(t.quantity) / 1000,
                price: Number(t.price) / 10000,
                pnl: t.pnl ? Number(t.pnl) / 100 : null,
                executedAt: t.executedAt.toISOString(),
            })) || [],
            positions: account?.positions.map(p => ({
                id: p.id,
                symbol: p.symbol,
                side: p.side,
                quantity: Number(p.quantity) / 1000,
                entryPrice: Number(p.entryPrice) / 10000,
                status: p.status,
                realizedPnl: p.realizedPnl ? Number(p.realizedPnl) / 100 : null,
                openedAt: p.openedAt.toISOString(),
                closedAt: p.closedAt?.toISOString() || null,
            })) || [],
            chatRooms: user.chatRooms.map(r => ({
                id: r.id,
                subject: r.subject,
                status: r.status,
                updatedAt: r.updatedAt.toISOString(),
                lastMessage: r.messages[0]?.content || null,
            })),
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error("Get user detail error:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json(
            { error: "ユーザー情報の取得に失敗しました", details: errorMessage },
            { status: 500 }
        )
    }
}
