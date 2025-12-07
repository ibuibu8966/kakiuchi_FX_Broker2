import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const { roomId } = await params

        const chatRoom = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: {
                user: {
                    select: { name: true, email: true },
                },
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        })

        if (!chatRoom) {
            return NextResponse.json({ error: "チャットルームが見つかりません" }, { status: 404 })
        }

        // 未読メッセージを既読にする
        await prisma.chatMessage.updateMany({
            where: {
                roomId,
                senderType: "USER",
                isRead: false,
            },
            data: { isRead: true },
        })

        return NextResponse.json({ chatRoom })
    } catch (error) {
        console.error("Get chat room error:", error)
        return NextResponse.json(
            { error: "チャットルームの取得に失敗しました" },
            { status: 500 }
        )
    }
}
