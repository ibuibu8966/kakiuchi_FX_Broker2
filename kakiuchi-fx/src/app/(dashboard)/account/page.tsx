import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, LEVERAGE_OPTIONS } from "@/lib/utils"
import { formatAmount } from "@/lib/utils/bigint"
import Link from "next/link"

export default async function AccountPage() {
    const session = await auth()

    const [user, account] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session?.user?.id },
        }),
        prisma.account.findFirst({
            where: { userId: session?.user?.id },
        }),
    ])

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">口座設定</h1>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* 口座情報 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">口座情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-slate-800">
                            <span className="text-slate-400">口座番号</span>
                            <span className="text-white font-mono">{account?.accountNumber || "---"}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-slate-800">
                            <span className="text-slate-400">口座ステータス</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${account?.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {translateStatus(account?.status || 'ACTIVE')}
                            </span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-slate-800">
                            <span className="text-slate-400">残高</span>
                            <span className="text-white font-bold">{formatAmount(account?.balance || 0n)}</span>
                        </div>
                        <div className="flex justify-between py-3">
                            <span className="text-slate-400">レバレッジ</span>
                            <span className="text-white font-bold">{account?.leverage || 200}倍</span>
                        </div>
                    </CardContent>
                </Card>

                {/* レバレッジ変更 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">レバレッジ変更</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm mb-4">
                            ポジションがない状態でのみ変更可能です。
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {LEVERAGE_OPTIONS.map((lev) => (
                                <button
                                    key={lev}
                                    className={`py-3 rounded-lg font-medium transition-all ${account?.leverage === lev
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        }`}
                                    disabled={account?.leverage === lev}
                                >
                                    {lev}倍
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* プロフィール情報 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">プロフィール</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-slate-800">
                            <span className="text-slate-400">お名前</span>
                            <span className="text-white">{user?.name || "---"}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-slate-800">
                            <span className="text-slate-400">メールアドレス</span>
                            <span className="text-white">{user?.email || "---"}</span>
                        </div>
                        <div className="flex justify-between py-3">
                            <span className="text-slate-400">電話番号</span>
                            <span className="text-white">{user?.phone || "未登録"}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* クイックリンク */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">クイックリンク</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link
                            href="/wallet"
                            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                            <span className="text-white">入金・出金</span>
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link
                            href="/trade"
                            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                            <span className="text-white">取引</span>
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link
                            href="/support"
                            className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                            <span className="text-white">サポート</span>
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
