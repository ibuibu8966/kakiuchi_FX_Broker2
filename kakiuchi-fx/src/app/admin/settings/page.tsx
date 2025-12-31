"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SystemSettings {
    spread: number
    commission: number
    losscut_level: number
    swapBuy: number
    swapSell: number
    depositWalletAddress: string
    depositQrImageUrl: string
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        spread: 20, // 2.0 pips
        commission: 0,
        losscut_level: 20,
        swapBuy: 0,
        swapSell: 0,
        depositWalletAddress: "",
        depositQrImageUrl: "",
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const response = await fetch("/api/admin/settings")
            if (response.ok) {
                const data = await response.json()
                if (data.settings) {
                    setSettings(data.settings)
                }
            }
        } catch (error) {
            console.error("Failed to fetch settings:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        try {
            const response = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            })

            if (response.ok) {
                setMessage({ type: "success", text: "設定を保存しました" })
            } else {
                throw new Error("保存に失敗しました")
            }
        } catch (error) {
            setMessage({ type: "error", text: "保存に失敗しました" })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">システム設定</h1>
                <p className="text-slate-400 mt-1">取引条件の設定</p>
            </div>

            <div className="max-w-2xl space-y-6">
                {/* スプレッド設定 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">スプレッド設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">
                                スプレッドマークアップ（0.1pips単位）
                            </label>
                            <Input
                                type="number"
                                value={settings.spread}
                                onChange={(e) => setSettings(prev => ({ ...prev, spread: parseInt(e.target.value) || 0 }))}
                                min="0"
                                className="bg-slate-800 border-slate-700 text-white max-w-xs"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                現在値: {(settings.spread / 10).toFixed(1)} pips（FIX配信価格に上乗せ）
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 手数料設定 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">手数料設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">
                                取引手数料（USDT/ロット）
                            </label>
                            <Input
                                type="number"
                                value={settings.commission}
                                onChange={(e) => setSettings(prev => ({ ...prev, commission: parseInt(e.target.value) || 0 }))}
                                min="0"
                                className="bg-slate-800 border-slate-700 text-white max-w-xs"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                0の場合、手数料なし
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* ロスカット設定 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">ロスカット設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">
                                ロスカット水準（証拠金維持率 %）
                            </label>
                            <Input
                                type="number"
                                value={settings.losscut_level}
                                onChange={(e) => setSettings(prev => ({ ...prev, losscut_level: parseInt(e.target.value) || 20 }))}
                                min="0"
                                max="100"
                                className="bg-slate-800 border-slate-700 text-white max-w-xs"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                証拠金維持率がこの水準を下回ると自動決済
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* スワップポイント設定 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">スワップポイント設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">
                                    買いスワップ（ポイント/日）
                                </label>
                                <Input
                                    type="number"
                                    value={settings.swapBuy}
                                    onChange={(e) => setSettings(prev => ({ ...prev, swapBuy: parseFloat(e.target.value) || 0 }))}
                                    step="0.1"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">
                                    売りスワップ（ポイント/日）
                                </label>
                                <Input
                                    type="number"
                                    value={settings.swapSell}
                                    onChange={(e) => setSettings(prev => ({ ...prev, swapSell: parseFloat(e.target.value) || 0 }))}
                                    step="0.1"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            正の値: 受取 / 負の値: 支払（例: BUY=-5.0, SELL=+2.0）
                        </p>
                    </CardContent>
                </Card>

                {/* 入金用ウォレット設定 */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">入金用ウォレット設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">
                                USDTウォレットアドレス（TRC20）
                            </label>
                            <Input
                                type="text"
                                value={settings.depositWalletAddress || ""}
                                onChange={(e) => setSettings(prev => ({ ...prev, depositWalletAddress: e.target.value }))}
                                placeholder="T..."
                                className="bg-slate-800 border-slate-700 text-white font-mono"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                顧客の入金画面に表示されるアドレス
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">
                                QRコード画像URL
                            </label>
                            <Input
                                type="text"
                                value={settings.depositQrImageUrl || ""}
                                onChange={(e) => setSettings(prev => ({ ...prev, depositQrImageUrl: e.target.value }))}
                                placeholder="https://..."
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                外部URLまたは/uploads/qr.pngの形式で設定
                            </p>
                            {settings.depositQrImageUrl && (
                                <div className="mt-3 p-3 bg-white rounded-lg inline-block">
                                    <img
                                        src={settings.depositQrImageUrl}
                                        alt="QR Preview"
                                        className="w-32 h-32 object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 保存ボタン */}
                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                        {message.text}
                    </div>
                )}

                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                    {isSaving ? "保存中..." : "設定を保存"}
                </Button>
            </div>
        </div>
    )
}
