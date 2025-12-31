// prisma/seed.ts
// デモデータの初期化
// 実行: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database with demo data...")

    // 管理者ユーザーを作成
    const adminPassword = await bcrypt.hash("admin123", 12)
    const admin = await prisma.user.upsert({
        where: { email: "admin@kakiuchi-fx.com" },
        update: {},
        create: {
            email: "admin@kakiuchi-fx.com",
            name: "管理者",
            passwordHash: adminPassword,
            role: "ADMIN",
            isActive: true,
        },
    })
    console.log("✅ Admin user created:", admin.email)

    // デモユーザーを作成（5人）
    const userPassword = await bcrypt.hash("demo1234", 12)

    const demoUsers = [
        { email: "tanaka@example.com", name: "田中太郎" },
        { email: "suzuki@example.com", name: "鈴木花子" },
        { email: "yamamoto@example.com", name: "山本健一" },
        { email: "sato@example.com", name: "佐藤美咲" },
        { email: "watanabe@example.com", name: "渡辺裕二" },
    ]

    for (const userData of demoUsers) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                email: userData.email,
                name: userData.name,
                passwordHash: userPassword,
                role: "USER",
                isActive: true,
            },
        })

        // 口座を作成
        let account = await prisma.account.findFirst({ where: { userId: user.id } })
        if (!account) {
            account = await prisma.account.create({
                data: {
                    userId: user.id,
                    accountNumber: `1000${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
                    leverage: 200,
                    balance: BigInt(Math.floor(Math.random() * 500000 + 10000) * 100), // $100-$5100
                    status: "ACTIVE",
                },
            })
        }

        console.log(`✅ User created: ${user.name} (${user.email})`)
    }

    // 入出金デモデータを作成
    const accounts = await prisma.account.findMany({
        include: { user: true },
        where: { user: { role: "USER" } },
    })

    const transactionData = [
        { type: "DEPOSIT" as const, amount: 50000n, status: "PENDING" as const, txHash: null },
        { type: "DEPOSIT" as const, amount: 100000n, status: "PENDING" as const, txHash: "abc123def456789..." },
        { type: "WITHDRAWAL" as const, amount: 20000n, status: "PENDING" as const, walletAddress: "TRx1234...abcd" },
        { type: "DEPOSIT" as const, amount: 200000n, status: "COMPLETED" as const, txHash: "completed_tx_123" },
        { type: "WITHDRAWAL" as const, amount: 50000n, status: "COMPLETED" as const, walletAddress: "TRx5678...efgh" },
    ]

    for (let i = 0; i < accounts.length && i < transactionData.length; i++) {
        const account = accounts[i]
        const txData = transactionData[i]

        await prisma.transaction.create({
            data: {
                accountId: account.id,
                type: txData.type,
                amount: txData.amount,
                status: txData.status,
                network: "TRC20",
                txHash: txData.txHash || null,
                walletAddress: txData.walletAddress || null,
                depositAddress: txData.type === "DEPOSIT" ? "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" : null,
            },
        })
        console.log(`✅ Transaction created: ${txData.type} ${Number(txData.amount) / 100} USDT for ${account.user.name}`)
    }

    // チャットデモデータを作成
    const chatUsers = accounts.slice(0, 3)
    const chatMessages = [
        { subject: "入金について", messages: ["入金申請をしましたが、いつ反映されますか？", "確認中です。少々お待ちください。", "ありがとうございます。"] },
        { subject: "取引について", messages: ["取引画面の使い方を教えてください。"] },
        { subject: "出金手続きについて", messages: ["出金申請の状況を教えてください。"] },
    ]

    for (let i = 0; i < chatUsers.length; i++) {
        const user = chatUsers[i].user
        const chatData = chatMessages[i]

        const room = await prisma.chatRoom.create({
            data: {
                userId: user.id,
                subject: chatData.subject,
                status: i === 0 ? "RESOLVED" : "OPEN",
            },
        })

        for (let j = 0; j < chatData.messages.length; j++) {
            await prisma.chatMessage.create({
                data: {
                    roomId: room.id,
                    senderId: j % 2 === 0 ? user.id : admin.id,
                    senderType: j % 2 === 0 ? "USER" : "ADMIN",
                    content: chatData.messages[j],
                    isRead: true,
                },
            })
        }
        console.log(`✅ Chat room created: "${chatData.subject}" for ${user.name}`)
    }

    // システム設定を作成
    let settings = await prisma.systemSettings.findFirst()
    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                spreadMarkup: 20, // 2.0 pips
                commissionPerLot: 0n,
                liquidationLevel: 20,
            },
        })
        console.log("✅ System settings created")
    }

    console.log("\n🎉 Demo data seeding completed!")
    console.log("\n📝 Login credentials:")
    console.log("   Admin: admin@kakiuchi-fx.com / admin123")
    console.log("   Demo Users: tanaka@example.com (etc.) / demo1234")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
