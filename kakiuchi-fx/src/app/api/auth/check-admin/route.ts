import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ isAdmin: false })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        })

        return NextResponse.json({ isAdmin: user?.role === "ADMIN" })
    } catch {
        return NextResponse.json({ isAdmin: false })
    }
}
