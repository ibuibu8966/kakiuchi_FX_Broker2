import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate } from "@/lib/utils"
import { bigIntToPrice, bigIntToLot, formatAmount } from "@/lib/utils/bigint"

export default async function PositionsPage() {
    const session = await auth()

    const account = await prisma.account.findFirst({
        where: { userId: session?.user?.id },
        include: {
            positions: {
                where: { status: "OPEN" },
                orderBy: { openedAt: "desc" },
            },
        },
    })

    const positions = account?.positions || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">ポジション</h1>
                <span className="text-slate-400">
                    保有中: {positions.length} ポジション
                </span>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">保有ポジション</CardTitle>
                </CardHeader>
                <CardContent>
                    {positions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">シンボル</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">方向</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">ロット</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">エントリー価格</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">SL</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">TP</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">必要証拠金</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">建玉日時</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((position) => (
                                        <tr key={position.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="py-4 px-4 text-white font-medium">{position.symbol}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${position.side === 'BUY'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {translateStatus(position.side)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-white">
                                                {bigIntToLot(position.quantity).toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-white font-mono">
                                                {bigIntToPrice(position.entryPrice).toFixed(3)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-slate-400 font-mono">
                                                {position.stopLoss ? bigIntToPrice(position.stopLoss).toFixed(3) : "---"}
                                            </td>
                                            <td className="py-4 px-4 text-right text-slate-400 font-mono">
                                                {position.takeProfit ? bigIntToPrice(position.takeProfit).toFixed(3) : "---"}
                                            </td>
                                            <td className="py-4 px-4 text-right text-white">
                                                {formatAmount(position.margin, false)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-slate-400 text-sm">
                                                {formatDate(position.openedAt)}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <button className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                                                    決済
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-slate-400 text-lg">保有中のポジションはありません</p>
                            <p className="text-slate-500 text-sm mt-1">取引画面から新規注文を行ってください</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
