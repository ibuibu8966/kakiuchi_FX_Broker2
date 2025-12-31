import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const positions = await prisma.position.findMany({
            where: { status: "OPEN" },
            orderBy: { openedAt: "desc" },
            include: {
                account: {
                    include: {
                        user: {
                            select: { name: true, email: true },
                        },
                    },
                },
            },
        })

        // Convert bigint to string for JSON serialization
        const serializedPositions = positions.map(pos => ({
            ...pos,
            quantity: pos.quantity.toString(),
            entryPrice: pos.entryPrice.toString(),
            openedAt: pos.openedAt.toISOString(),
        }))

        return NextResponse.json({ positions: serializedPositions })
    } catch (error) {
        console.error("Error fetching positions:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
