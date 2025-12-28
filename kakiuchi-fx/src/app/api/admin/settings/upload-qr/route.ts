import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json(
                { error: "ファイルがありません" },
                { status: 400 }
            )
        }

        // ファイルタイプチェック
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "画像ファイルをアップロードしてください" },
                { status: 400 }
            )
        }

        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: "ファイルサイズは5MB以下にしてください" },
                { status: 400 }
            )
        }

        // Supabaseクライアントを取得
        const supabase = getSupabaseAdmin()

        // ファイルをArrayBufferに変換
        const arrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        // 拡張子を取得
        const ext = file.name.split(".").pop() || "png"
        const fileName = `deposit-qr.${ext}`

        // Supabase Storageにアップロード
        const { error: uploadError } = await supabase.storage
            .from("deposit-qr")
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            })

        if (uploadError) {
            console.error("Supabase upload error:", uploadError)
            return NextResponse.json(
                { error: "ファイルのアップロードに失敗しました" },
                { status: 500 }
            )
        }

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
            .from("deposit-qr")
            .getPublicUrl(fileName)

        // SystemSettingsを更新
        const existingSettings = await prisma.systemSettings.findFirst()

        if (existingSettings) {
            await prisma.systemSettings.update({
                where: { id: existingSettings.id },
                data: { depositQrCodeUrl: publicUrl },
            })
        } else {
            await prisma.systemSettings.create({
                data: { depositQrCodeUrl: publicUrl },
            })
        }

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "DEPOSIT_QR_UPLOADED",
                entityType: "SystemSettings",
                entityId: existingSettings?.id || "new",
                newValue: { depositQrCodeUrl: publicUrl },
            },
        })

        return NextResponse.json({
            success: true,
            url: publicUrl,
        })
    } catch (error) {
        console.error("Upload QR code error:", error)
        return NextResponse.json(
            { error: "QRコードのアップロードに失敗しました" },
            { status: 500 }
        )
    }
}
