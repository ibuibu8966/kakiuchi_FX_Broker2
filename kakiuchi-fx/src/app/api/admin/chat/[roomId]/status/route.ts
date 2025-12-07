import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ChatStatus } from "@prisma/client"

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
        const { status } = body

        if (!["OPEN", "RESOLVED", "CLOSED"].includes(status)) {
            return NextResponse.json({ error: "無効なステータスです" }, { status: 400 })
        }

        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { status: status as ChatStatus },
        })

        return NextResponse.json({ message: "ステータスを更新しました" })
    } catch (error) {
        console.error("Update chat status error:", error)
        return NextResponse.json(
            { error: "ステータスの更新に失敗しました" },
            { status: 500 }
        )
    }
}
