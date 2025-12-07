import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate, getStatusColor } from "@/lib/utils"
import { formatAmount } from "@/lib/utils/bigint"
import { TransactionActionButtons } from "./transaction-actions"

export default async function AdminTransactionsPage() {
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">入出金管理</h1>
                <p className="text-slate-400 mt-1">入金・出金申請の承認を行います</p>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">
                        申請一覧 ({transactions.filter(t => t.status === "PENDING").length}件の承認待ち)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">申請日時</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">ユーザー</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">口座</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">種別</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">金額</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">振込先</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">ステータス</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="py-4 px-4 text-slate-400 text-sm">
                                                {formatDate(tx.createdAt)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="text-white font-medium">{tx.account.user.name}</p>
                                                <p className="text-xs text-slate-500">{tx.account.user.email}</p>
                                            </td>
                                            <td className="py-4 px-4 text-white font-mono text-sm">
                                                {tx.account.accountNumber}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === "DEPOSIT"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : "bg-orange-500/20 text-orange-400"
                                                    }`}>
                                                    {translateStatus(tx.type)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-white font-bold">
                                                {formatAmount(tx.amount)}
                                            </td>
                                            <td className="py-4 px-4">
                                                {tx.type === "WITHDRAWAL" && tx.bankName ? (
                                                    <div className="text-sm">
                                                        <p className="text-white">{tx.bankName} {tx.bankBranch}</p>
                                                        <p className="text-slate-400">{tx.bankAccountType} {tx.bankAccountNumber}</p>
                                                        <p className="text-slate-400">{tx.bankAccountName}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500">---</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                                                    {translateStatus(tx.status)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {tx.status === "PENDING" && (
                                                    <TransactionActionButtons
                                                        transactionId={tx.id}
                                                        type={tx.type}
                                                        accountId={tx.accountId}
                                                        amount={tx.amount.toString()}
                                                    />
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <p className="text-slate-400">申請はありません</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
