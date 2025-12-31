import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                status: { in: ["PENDING", "APPROVED"] },
            },
            orderBy: [
                { status: "asc" },
                { createdAt: "asc" },
            ],
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
        const serializedTransactions = transactions.map(tx => ({
            ...tx,
            amount: tx.amount.toString(),
            createdAt: tx.createdAt.toISOString(),
        }))

        return NextResponse.json({ transactions: serializedTransactions })
    } catch (error) {
        console.error("Error fetching transactions:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
