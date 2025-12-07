import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate } from "@/lib/utils"
import { bigIntToPrice, bigIntToLot, formatAmount } from "@/lib/utils/bigint"

export default async function HistoryPage() {
    const session = await auth()

    const account = await prisma.account.findFirst({
        where: { userId: session?.user?.id },
        include: {
            trades: {
                orderBy: { executedAt: "desc" },
                take: 100,
            },
        },
    })

    const trades = account?.trades || []

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">取引履歴</h1>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">最近の取引</CardTitle>
                </CardHeader>
                <CardContent>
                    {trades.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">日時</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">シンボル</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">種別</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">方向</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">ロット</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">価格</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">手数料</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">損益</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.map((trade) => (
                                        <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="py-4 px-4 text-slate-400 text-sm">
                                                {formatDate(trade.executedAt)}
                                            </td>
                                            <td className="py-4 px-4 text-white font-medium">{trade.symbol}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${trade.tradeType === 'OPEN'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                    {trade.tradeType === 'OPEN' ? '新規' : '決済'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${trade.side === 'BUY'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {translateStatus(trade.side)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-white">
                                                {bigIntToLot(trade.quantity).toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-white font-mono">
                                                {bigIntToPrice(trade.price).toFixed(3)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-slate-400">
                                                {formatAmount(trade.commission, false)}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                {trade.pnl !== null ? (
                                                    <span className={Number(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {formatAmount(trade.pnl)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">---</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-slate-400 text-lg">取引履歴がありません</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
