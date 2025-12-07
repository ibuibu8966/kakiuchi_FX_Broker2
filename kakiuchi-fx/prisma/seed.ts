// prisma/seed.ts
// 管理者ユーザーとシステム設定の初期化
// 実行: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

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
            kycStatus: "VERIFIED",
            isActive: true,
        },
    })

    console.log("✅ Admin user created:", admin.email)

    // テストユーザーを作成
    const testPassword = await bcrypt.hash("test1234", 12)

    const testUser = await prisma.user.upsert({
        where: { email: "test@example.com" },
        update: {},
        create: {
            email: "test@example.com",
            name: "テストユーザー",
            passwordHash: testPassword,
            role: "USER",
            kycStatus: "VERIFIED",
            postalCode: "100-0001",
            prefecture: "東京都",
            city: "千代田区",
            address1: "1-1-1",
            isActive: true,
        },
    })

    console.log("✅ Test user created:", testUser.email)

    // テストユーザーの口座を作成
    let account = await prisma.account.findFirst({
        where: { userId: testUser.id },
    })

    if (!account) {
        account = await prisma.account.create({
            data: {
                userId: testUser.id,
                accountNumber: "10001234",
                leverage: 100,
                balance: 100000000n, // 100万円 (×100)
                equity: 100000000n,
                status: "ACTIVE",
            },
        })
        console.log("✅ Test account created:", account.accountNumber, "Balance: ¥1,000,000")
    } else {
        console.log("✅ Test account exists:", account.accountNumber)
    }

    // システム設定を作成
    let settings = await prisma.systemSettings.findFirst()

    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                spreadMarkup: 20, // 2.0 pips
                commissionPerLot: 0n,
                liquidationLevel: 20, // 20%
            },
        })
        console.log("✅ System settings created")
    } else {
        console.log("✅ System settings exist")
    }

    console.log("   - Spread: 2.0 pips")
    console.log("   - Commission: ¥0/lot")
    console.log("   - Liquidation Level: 20%")

    console.log("\n🎉 Seeding completed!")
    console.log("\n📝 Login credentials:")
    console.log("   Admin: admin@kakiuchi-fx.com / admin123")
    console.log("   User:  test@example.com / test1234")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
