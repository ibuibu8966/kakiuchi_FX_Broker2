"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
    id: string
    name: string
    email: string
    accountNumber: string
}

export function CreateChatButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const [formData, setFormData] = useState({
        userId: "",
        subject: "",
        message: "",
    })

    // ユーザー一覧を取得
    useEffect(() => {
        if (isOpen && users.length === 0) {
            setLoading(true)
            fetch("/api/admin/users")
                .then(res => res.json())
                .then(data => {
                    setUsers(data.users || [])
                })
                .catch(err => {
                    console.error("Failed to fetch users:", err)
                })
                .finally(() => {
                    setLoading(false)
                })
        }
    }, [isOpen, users.length])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSubmitting(true)

        try {
            const res = await fetch("/api/admin/chat/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "エラーが発生しました")
            }

            setIsOpen(false)
            setFormData({ userId: "", subject: "", message: "" })
            // 作成したチャットルームに遷移
            router.push(`/admin/chat/${data.chatRoom.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : "エラーが発生しました")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
            >
                + 新規チャット
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">新規チャット作成</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* ユーザー選択 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    宛先ユーザー
                                </label>
                                {loading ? (
                                    <div className="text-slate-500">読み込み中...</div>
                                ) : (
                                    <select
                                        value={formData.userId}
                                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                        required
                                    >
                                        <option value="">選択してください</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* 件名入力 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    件名（任意）
                                </label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                    placeholder="例: 入金確認のお願い"
                                />
                            </div>

                            {/* メッセージ入力 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    メッセージ
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                                    rows={4}
                                    placeholder="メッセージを入力してください"
                                    required
                                />
                            </div>

                            {/* エラー表示 */}
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* ボタン */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false)
                                        setError("")
                                    }}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium disabled:opacity-50"
                                >
                                    {submitting ? "作成中..." : "送信"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
