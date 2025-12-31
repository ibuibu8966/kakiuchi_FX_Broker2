import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const chatRooms = await prisma.chatRoom.findMany({
            orderBy: [
                { status: "asc" },
                { updatedAt: "desc" },
            ],
            include: {
                user: {
                    select: { name: true, email: true },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                _count: {
                    select: { messages: true },
                },
            },
        })

        // Convert dates to string for JSON serialization
        const serializedChatRooms = chatRooms.map(room => ({
            ...room,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
            messages: room.messages.map(msg => ({
                ...msg,
                createdAt: msg.createdAt.toISOString(),
            })),
        }))

        return NextResponse.json({ chatRooms: serializedChatRooms })
    } catch (error) {
        console.error("Error fetching chat rooms:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
