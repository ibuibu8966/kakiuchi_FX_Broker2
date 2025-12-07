import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const { roomId } = await params
        const body = await request.json()
        const { content } = body

        if (!content?.trim()) {
            return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 })
        }

        // メッセージ作成
        const message = await prisma.chatMessage.create({
            data: {
                roomId,
                senderId: session.user.id,
                senderType: "ADMIN",
                content: content.trim(),
            },
        })

        // チャットルームを更新
        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { updatedAt: new Date() },
        })

        return NextResponse.json({ message })
    } catch (error) {
        console.error("Send admin message error:", error)
        return NextResponse.json(
            { error: "メッセージの送信に失敗しました" },
            { status: 500 }
        )
    }
}
