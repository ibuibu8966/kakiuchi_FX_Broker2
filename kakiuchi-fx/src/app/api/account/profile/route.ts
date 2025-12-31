import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        })

        return NextResponse.json({ user })
    } catch (error) {
        console.error("Error fetching user profile:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
