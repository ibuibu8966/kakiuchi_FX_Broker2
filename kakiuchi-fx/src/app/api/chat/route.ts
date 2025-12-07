import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// チャットルーム取得/作成
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        // 既存のチャットルームを取得
        let chatRoom = await prisma.chatRoom.findFirst({
            where: {
                userId: session.user.id,
                status: { in: ["OPEN", "RESOLVED"] },
            },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        // なければ新規作成
        if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
                data: {
                    userId: session.user.id,
                },
                include: {
                    messages: true,
                },
            })
        }

        return NextResponse.json({ chatRoom })
    } catch (error) {
        console.error("Get chat room error:", error)
        return NextResponse.json(
            { error: "チャットルームの取得に失敗しました" },
            { status: 500 }
        )
    }
}
