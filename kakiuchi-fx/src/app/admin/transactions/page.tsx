"use client"

import { useAdminData } from "@/contexts/admin-data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate, getStatusColor } from "@/lib/utils"
import { TransactionActionButtons } from "./transaction-actions"
import { CreateTransactionButton } from "./create-transaction-button"

function formatAmount(value: string | number | bigint): string {
    const num = typeof value === "string" ? parseFloat(value) : Number(value)
    return `$${(num / 100).toFixed(2)}`
}

export default function AdminTransactionsPage() {
    const { transactions, isLoading, refreshTransactions } = useAdminData()

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">入出金管理（USDT）</h1>
                    <p className="text-slate-400 mt-1">読み込み中...</p>
                </div>
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="h-96 animate-pulse bg-slate-800/50 rounded" />
                </Card>
            </div>
        )
    }

    const pendingCount = transactions.filter(t => t.status === "PENDING").length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">入出金管理（USDT）</h1>
                    <p className="text-slate-400 mt-1">入金・出金申請の承認を行います</p>
                </div>
                <CreateTransactionButton />
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">
                        申請一覧 ({pendingCount}件の承認待ち)
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
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">種別</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">金額</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">詳細</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">ステータス</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="py-4 px-4 text-slate-400 text-sm">
                                                {formatDate(new Date(tx.createdAt))}
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="text-white font-medium">{tx.account.user.name}</p>
                                                <p className="text-xs text-slate-500">{tx.account.user.email}</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === "DEPOSIT"
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-orange-500/20 text-orange-400"
                                                    }`}>
                                                    {translateStatus(tx.type)}
                                                </span>
                                                <span className="ml-2 text-xs text-slate-500">
                                                    {tx.network || "TRC20"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-white font-bold">
                                                {formatAmount(tx.amount)} USDT
                                            </td>
                                            <td className="py-4 px-4">
                                                {tx.type === "DEPOSIT" ? (
                                                    <div className="text-sm">
                                                        <p className="text-slate-400">TxHash:</p>
                                                        {tx.txHash ? (
                                                            <a
                                                                href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 hover:underline font-mono text-xs break-all"
                                                            >
                                                                {tx.txHash.slice(0, 20)}...
                                                            </a>
                                                        ) : (
                                                            <span className="text-yellow-400 text-xs">未入力</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm">
                                                        <p className="text-slate-400">送金先:</p>
                                                        <code className="text-green-400 text-xs break-all">
                                                            {tx.walletAddress || "---"}
                                                        </code>
                                                    </div>
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
                                                        amount={tx.amount}
                                                        onSuccess={refreshTransactions}
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
