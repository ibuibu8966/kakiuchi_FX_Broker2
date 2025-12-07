import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const body = await request.json()
        const { content } = body

        if (!content || !content.trim()) {
            return NextResponse.json(
                { error: "メッセージを入力してください" },
                { status: 400 }
            )
        }

        // ユーザーのチャットルームを取得
        let chatRoom = await prisma.chatRoom.findFirst({
            where: {
                userId: session.user.id,
                status: { in: ["OPEN", "RESOLVED"] },
            },
            orderBy: { createdAt: "desc" },
        })

        // なければ作成
        if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
                data: {
                    userId: session.user.id,
                },
            })
        }

        // メッセージ送信でステータスをOPENに戻す
        if (chatRoom.status === "RESOLVED") {
            await prisma.chatRoom.update({
                where: { id: chatRoom.id },
                data: { status: "OPEN" },
            })
        }

        // メッセージ作成
        const message = await prisma.chatMessage.create({
            data: {
                roomId: chatRoom.id,
                senderId: session.user.id,
                senderType: "USER",
                content: content.trim(),
            },
        })

        return NextResponse.json({ message })
    } catch (error) {
        console.error("Send message error:", error)
        return NextResponse.json(
            { error: "メッセージの送信に失敗しました" },
            { status: 500 }
        )
    }
}
