import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const body = await request.json()
        const { userId, subject, message } = body

        // バリデーション
        if (!userId || !message) {
            return NextResponse.json(
                { error: "ユーザーとメッセージは必須です" },
                { status: 400 }
            )
        }

        // ユーザーの存在確認
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return NextResponse.json(
                { error: "ユーザーが見つかりません" },
                { status: 404 }
            )
        }

        // ChatRoomとメッセージを作成
        const chatRoom = await prisma.chatRoom.create({
            data: {
                userId,
                subject: subject || "管理者からのお知らせ",
                status: "OPEN",
                messages: {
                    create: {
                        content: message,
                        senderType: "ADMIN",
                        senderId: session.user.id,
                    },
                },
            },
            include: {
                messages: true,
                user: {
                    select: { name: true, email: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            chatRoom: {
                id: chatRoom.id,
                subject: chatRoom.subject,
                status: chatRoom.status,
                userName: chatRoom.user.name,
                createdAt: chatRoom.createdAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("Create chat error:", error)
        return NextResponse.json(
            { error: "チャットの作成に失敗しました" },
            { status: 500 }
        )
    }
}
