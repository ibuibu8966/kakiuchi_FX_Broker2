import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate, getStatusColor } from "@/lib/utils"
import { bigIntToPrice, bigIntToLot } from "@/lib/utils/bigint"

export default async function AdminOrdersPage() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
            account: {
                include: {
                    user: {
                        select: { name: true },
                    },
                },
            },
        },
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">注文履歴</h1>
                <p className="text-slate-400 mt-1">最新100件</p>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">全注文履歴</CardTitle>
                </CardHeader>
                <CardContent>
                    {orders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">日時</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">ユーザー</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">シンボル</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">タイプ</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">方向</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">ロット</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">約定価格</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="py-4 px-4 text-slate-400 text-sm">
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td className="py-4 px-4 text-white">
                                                {order.account.user.name}
                                            </td>
                                            <td className="py-4 px-4 text-white font-medium">
                                                {order.symbol}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-300">
                                                    {translateStatus(order.orderType)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${order.side === 'BUY'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {translateStatus(order.side)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-white">
                                                {bigIntToLot(order.quantity).toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-white font-mono">
                                                {order.filledPrice ? bigIntToPrice(order.filledPrice).toFixed(3) : "---"}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                                                    {translateStatus(order.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <p className="text-slate-400">注文履歴がありません</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
