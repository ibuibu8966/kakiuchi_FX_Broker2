"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ID_DOCUMENT_TYPES, ADDRESS_DOCUMENT_TYPES, translateStatus, getStatusColor } from "@/lib/utils"

interface KycData {
    kycStatus: string
    kycRejectedReason: string | null
    postalCode: string | null
    prefecture: string | null
    city: string | null
    address1: string | null
    address2: string | null
    idDocumentType: string | null
    idDocumentUrl: string | null
    addressDocumentType: string | null
    addressDocumentUrl: string | null
}

export default function KycPage() {
    const { data: session } = useSession()
    const [kycData, setKycData] = useState<KycData | null>(null)
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // フォームデータ
    const [formData, setFormData] = useState({
        postalCode: "",
        prefecture: "",
        city: "",
        address1: "",
        address2: "",
        idDocumentType: "",
        addressDocumentType: "",
    })

    useEffect(() => {
        fetchKycData()
    }, [])

    const fetchKycData = async () => {
        try {
            const response = await fetch("/api/kyc")
            if (response.ok) {
                const data = await response.json()
                setKycData(data)
                // 既存データをフォームに反映
                setFormData({
                    postalCode: data.postalCode || "",
                    prefecture: data.prefecture || "",
                    city: data.city || "",
                    address1: data.address1 || "",
                    address2: data.address2 || "",
                    idDocumentType: data.idDocumentType || "",
                    addressDocumentType: data.addressDocumentType || "",
                })
            }
        } catch (error) {
            console.error("Failed to fetch KYC data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmitAddress = async () => {
        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch("/api/kyc/address", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postalCode: formData.postalCode,
                    prefecture: formData.prefecture,
                    city: formData.city,
                    address1: formData.address1,
                    address2: formData.address2,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "保存に失敗しました")
            }

            setStep(2)
            fetchKycData()
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitKyc = async () => {
        if (!formData.idDocumentType || !formData.addressDocumentType) {
            setMessage({ type: "error", text: "書類の種類を選択してください" })
            return
        }

        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await fetch("/api/kyc/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idDocumentType: formData.idDocumentType,
                    addressDocumentType: formData.addressDocumentType,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "申請に失敗しました")
            }

            setMessage({ type: "success", text: "KYC申請を受け付けました。審査完了までお待ちください。" })
            fetchKycData()
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "エラーが発生しました" })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    // 審査中または承認済みの場合
    if (kycData?.kycStatus === "SUBMITTED" || kycData?.kycStatus === "VERIFIED") {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">本人確認（KYC）</h1>

                <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
                    <CardContent className="p-8 text-center">
                        {kycData.kycStatus === "VERIFIED" ? (
                            <>
                                <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">本人確認完了</h2>
                                <p className="text-slate-400">
                                    本人確認が完了しました。すべての機能をご利用いただけます。
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">審査中</h2>
                                <p className="text-slate-400">
                                    本人確認書類を審査中です。通常1〜2営業日で完了します。
                                </p>
                            </>
                        )}

                        <div className="mt-6">
                            <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(kycData.kycStatus)}`}>
                                {translateStatus(kycData.kycStatus)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 却下された場合
    if (kycData?.kycStatus === "REJECTED") {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">本人確認（KYC）</h1>

                <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
                    <CardContent className="p-8">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">審査が却下されました</h2>
                            {kycData.kycRejectedReason && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-left mt-4">
                                    <p className="text-sm text-red-400 font-medium mb-1">却下理由:</p>
                                    <p className="text-white">{kycData.kycRejectedReason}</p>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => setStep(1)}
                            className="w-full"
                        >
                            再申請する
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">本人確認（KYC）</h1>

            {/* ステップインジケーター */}
            <div className="flex items-center gap-4 max-w-2xl">
                <div className={`flex items-center gap-2 ${step >= 1 ? "text-blue-400" : "text-slate-500"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-blue-600" : "bg-slate-700"}`}>
                        1
                    </div>
                    <span className="text-sm font-medium">住所入力</span>
                </div>
                <div className="flex-1 h-px bg-slate-700" />
                <div className={`flex items-center gap-2 ${step >= 2 ? "text-blue-400" : "text-slate-500"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-blue-600" : "bg-slate-700"}`}>
                        2
                    </div>
                    <span className="text-sm font-medium">書類選択</span>
                </div>
                <div className="flex-1 h-px bg-slate-700" />
                <div className={`flex items-center gap-2 ${step >= 3 ? "text-blue-400" : "text-slate-500"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-blue-600" : "bg-slate-700"}`}>
                        3
                    </div>
                    <span className="text-sm font-medium">完了</span>
                </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-800 max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-white">
                        {step === 1 && "住所情報を入力"}
                        {step === 2 && "本人確認書類を選択"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">郵便番号</label>
                                    <Input
                                        type="text"
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        placeholder="123-4567"
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">都道府県</label>
                                    <Input
                                        type="text"
                                        name="prefecture"
                                        value={formData.prefecture}
                                        onChange={handleChange}
                                        placeholder="東京都"
                                        className="bg-slate-800 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 block mb-2">市区町村</label>
                                <Input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="渋谷区"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 block mb-2">番地</label>
                                <Input
                                    type="text"
                                    name="address1"
                                    value={formData.address1}
                                    onChange={handleChange}
                                    placeholder="1-2-3"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 block mb-2">建物名・部屋番号（任意）</label>
                                <Input
                                    type="text"
                                    name="address2"
                                    value={formData.address2}
                                    onChange={handleChange}
                                    placeholder="○○マンション 101"
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <Button
                                onClick={handleSubmitAddress}
                                disabled={isSubmitting || !formData.postalCode || !formData.prefecture || !formData.city || !formData.address1}
                                className="w-full"
                            >
                                {isSubmitting ? "保存中..." : "次へ"}
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm text-slate-400 block mb-3">身分証明書の種類</label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {ID_DOCUMENT_TYPES.map((doc) => (
                                        <button
                                            key={doc.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, idDocumentType: doc.value }))}
                                            className={`p-4 rounded-lg text-left transition-all ${formData.idDocumentType === doc.value
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                                }`}
                                        >
                                            {doc.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    ※ 書類のアップロードは管理者が手動で確認します（デモ版のため画像アップロードはスキップ）
                                </p>
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 block mb-3">住所確認書類の種類</label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {ADDRESS_DOCUMENT_TYPES.map((doc) => (
                                        <button
                                            key={doc.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, addressDocumentType: doc.value }))}
                                            className={`p-4 rounded-lg text-left transition-all ${formData.addressDocumentType === doc.value
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                                }`}
                                        >
                                            {doc.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === "success"
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1"
                                >
                                    戻る
                                </Button>
                                <Button
                                    onClick={handleSubmitKyc}
                                    disabled={isSubmitting || !formData.idDocumentType || !formData.addressDocumentType}
                                    className="flex-1"
                                >
                                    {isSubmitting ? "申請中..." : "KYC申請する"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
