import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { formatAmount } from "@/lib/utils/bigint"

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            accounts: {
                select: {
                    accountNumber: true,
                    balance: true,
                    status: true,
                    leverage: true,
                },
            },
        },
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">ユーザー管理</h1>
                <p className="text-slate-400 mt-1">全{users.length}ユーザー</p>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">ユーザー一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">名前</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">メール</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">口座番号</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">残高</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">レバレッジ</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">権限</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">登録日</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors">
                                        <td className="py-4 px-4">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                <p className="text-white font-medium hover:text-blue-400">{user.name}</p>
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4 text-slate-400 text-sm">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                {user.email}
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4 text-white font-mono text-sm">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                {user.accounts[0]?.accountNumber || "---"}
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4 text-right text-white font-bold">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                {user.accounts[0] ? formatAmount(user.accounts[0].balance) : "---"}
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4 text-center text-white">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                {user.accounts[0]?.leverage || "---"}倍
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === "ADMIN"
                                                        ? "bg-red-500/20 text-red-400"
                                                        : "bg-slate-500/20 text-slate-400"
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4 text-slate-400 text-sm">
                                            <Link href={`/admin/users/${user.id}`} className="block">
                                                {formatDate(user.createdAt, false)}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
