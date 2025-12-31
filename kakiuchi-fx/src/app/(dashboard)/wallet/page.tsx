"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCustomerData } from "@/contexts/customer-data-context"

type TabType = "deposit" | "withdraw" | "history"

export default function WalletPage() {
    // Get data from context (prefetched)
    const { transactions: contextTransactions, settings, refreshTransactions } = useCustomerData()

    const [activeTab, setActiveTab] = useState<TabType>("deposit")

    // Use context data for wallet settings
    const walletSettings = settings ? {
        depositWalletAddress: settings.depositWalletAddress,
        depositQrImageUrl: settings.depositQrImageUrl,
    } : { depositWalletAddress: null, depositQrImageUrl: null }

    // Use context transactions
    const transactions = contextTransactions

    // 入金用state
    const [depositStep, setDepositStep] = useState<"request" | "confirm">("request")
    const [depositAmount, setDepositAmount] = useState("")
    const [txHash, setTxHash] = useState("")
    const [depositTransactionId, setDepositTransactionId] = useState("")

    // 出金用state
    const [withdrawAmount, setWithdrawAmount] = useState("")
    const [walletAddress, setWalletAddress] = useState("")
    const [network, setNetwork] = useState("TRC20")

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // 入金申請
    const handleDepositRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "DEPOSIT",
                    amount: parseFloat(depositAmount),
                    network: "TRC20",
                    depositAddress: walletSettings.depositWalletAddress || "",
                }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "申請に失敗しました")

            setDepositTransactionId(data.transactionId)
            setDepositStep("confirm")
            refreshTransactions()
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    // TxHash送信
    const handleTxHashSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch(`/api/transactions/${depositTransactionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ txHash }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "送信に失敗しました")

            setMessage({ type: "success", text: "トランザクションIDを送信しました。管理者の確認後、残高に反映されます。" })
            setDepositAmount("")
            setTxHash("")
            setDepositStep("request")
            refreshTransactions()
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    // 出金申請
    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        if (network === "TRC20" && !walletAddress.startsWith("T")) {
            setMessage({ type: "error", text: "TRC20アドレスは「T」で始まる必要があります" })
            setIsSubmitting(false)
            return
        }

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "WITHDRAWAL",
                    amount: parseFloat(withdrawAmount),
                    walletAddress,
                    network,
                }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "申請に失敗しました")

            setMessage({ type: "success", text: "出金申請を受け付けました。管理者の確認後、送金されます。" })
            setWithdrawAmount("")
            setWalletAddress("")
            refreshTransactions()
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = () => {
        if (walletSettings.depositWalletAddress) {
            navigator.clipboard.writeText(walletSettings.depositWalletAddress)
            setMessage({ type: "success", text: "アドレスをコピーしました" })
            setTimeout(() => setMessage(null), 2000)
        }
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            PENDING: "bg-yellow-500/20 text-yellow-400",
            APPROVED: "bg-blue-500/20 text-blue-400",
            COMPLETED: "bg-green-500/20 text-green-400",
            REJECTED: "bg-red-500/20 text-red-400",
        }
        const labels: Record<string, string> = {
            PENDING: "申請中",
            APPROVED: "承認済",
            COMPLETED: "完了",
            REJECTED: "却下",
        }
        return <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || "bg-slate-500/20 text-slate-400"}`}>{labels[status] || status}</span>
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">ウォレット（USDT）</h1>

            {/* タブ */}
            <div className="flex gap-2">
                {[
                    { id: "deposit", label: "入金" },
                    { id: "withdraw", label: "出金" },
                    { id: "history", label: "履歴" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as TabType); setMessage(null) }}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm ${message.type === "success"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                    {message.text}
                </div>
            )}

            {/* 入金タブ */}
            {activeTab === "deposit" && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${depositStep === "request" ? "bg-blue-500" : "bg-green-500"}`}>
                                    {depositStep === "request" ? "1" : "✓"}
                                </span>
                                入金申請
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleDepositRequest} className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">入金額（USDT）</label>
                                    <Input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder="100"
                                        min="10"
                                        step="0.01"
                                        required
                                        disabled={depositStep !== "request"}
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">最低入金額: 10 USDT</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-sm text-blue-400">ネットワーク: <span className="font-bold">TRC20</span></p>
                                </div>
                                {depositStep === "request" && (
                                    <Button type="submit" disabled={isSubmitting} className="w-full">
                                        {isSubmitting ? "処理中..." : "次へ"}
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    <Card className={`bg-slate-900/50 border-slate-800 ${depositStep !== "confirm" ? "opacity-50" : ""}`}>
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${depositStep === "confirm" ? "bg-blue-500" : "bg-slate-600"}`}>2</span>
                                送金 & 確認
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {depositStep === "confirm" ? (
                                <div className="space-y-4">
                                    {/* QRコード表示 */}
                                    {walletSettings.depositQrImageUrl && (
                                        <div className="flex justify-center p-4 bg-white rounded-lg">
                                            <img
                                                src={walletSettings.depositQrImageUrl}
                                                alt="入金用QRコード"
                                                className="w-48 h-48 object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                                        <label className="text-sm text-slate-400 block mb-2">送金先アドレス（TRC20）</label>
                                        <div className="flex gap-2">
                                            <code className="flex-1 p-3 bg-slate-900 rounded text-green-400 text-xs break-all">
                                                {walletSettings.depositWalletAddress || "アドレス未設定"}
                                            </code>
                                            <Button type="button" onClick={copyToClipboard} variant="outline" size="sm" disabled={!walletSettings.depositWalletAddress}>コピー</Button>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                        <p className="text-sm text-yellow-400">⚠️ 必ず <span className="font-bold">TRC20</span> で送金してください</p>
                                    </div>
                                    <form onSubmit={handleTxHashSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-sm text-slate-400 block mb-2">TxHash</label>
                                            <Input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="送金後のTxHashを入力" required className="bg-slate-800 border-slate-700 text-white font-mono" />
                                        </div>
                                        <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "送信中..." : "送信完了を報告"}</Button>
                                    </form>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">ステップ1を完了してください</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 出金タブ */}
            {activeTab === "withdraw" && (
                <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-white">出金申請</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">出金額（USDT）</label>
                                <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="100" min="10" step="0.01" required className="bg-slate-800 border-slate-700 text-white" />
                                <p className="text-xs text-slate-500 mt-1">最低出金額: 10 USDT / 手数料: 1 USDT</p>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">ネットワーク</label>
                                <select value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full h-11 rounded-lg border-2 border-slate-700 bg-slate-800 px-4 text-white">
                                    <option value="TRC20">TRC20 (TRON) - 推奨</option>
                                    <option value="ERC20">ERC20 (Ethereum)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">送金先アドレス</label>
                                <Input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder={network === "TRC20" ? "T..." : "0x..."} required className="bg-slate-800 border-slate-700 text-white font-mono" />
                            </div>
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-sm text-yellow-400">⚠️ アドレスを間違えると資産が失われます</p>
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "処理中..." : "出金申請する"}</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* 履歴タブ */}
            {activeTab === "history" && (
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">申請履歴</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {transactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-slate-400">日時</th>
                                            <th className="text-left py-3 px-4 text-slate-400">種別</th>
                                            <th className="text-right py-3 px-4 text-slate-400">金額</th>
                                            <th className="text-center py-3 px-4 text-slate-400">ステータス</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                <td className="py-3 px-4 text-slate-400">{formatDate(tx.createdAt)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === "DEPOSIT" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                                                        {tx.type === "DEPOSIT" ? "入金" : "出金"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-white font-mono">{(Number(tx.amount) / 100).toFixed(2)} USDT</td>
                                                <td className="py-3 px-4 text-center">{getStatusBadge(tx.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">履歴がありません</div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
