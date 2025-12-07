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
        const { postalCode, prefecture, city, address1, address2 } = body

        if (!postalCode || !prefecture || !city || !address1) {
            return NextResponse.json(
                { error: "必須項目が不足しています" },
                { status: 400 }
            )
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                postalCode,
                prefecture,
                city,
                address1,
                address2: address2 || null,
            },
        })

        return NextResponse.json({ message: "住所を保存しました" })
    } catch (error) {
        console.error("Save address error:", error)
        return NextResponse.json(
            { error: "住所の保存に失敗しました" },
            { status: 500 }
        )
    }
}
