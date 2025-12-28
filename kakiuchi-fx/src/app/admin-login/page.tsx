"use client"

import { useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError("メールアドレスまたはパスワードが正しくありません")
                setIsLoading(false)
            } else {
                // 管理者権限チェック
                const res = await fetch("/api/auth/check-admin")
                const data = await res.json()

                if (data.isAdmin) {
                    // ログイン成功 - ローディング状態を維持したままリダイレクト
                    router.refresh()
                    router.push("/admin")
                } else {
                    setError("管理者権限がありません")
                    await signOut({ redirect: false })
                    setIsLoading(false)
                }
            }
        } catch {
            setError("ログインに失敗しました")
            setIsLoading(false)
        }
    }

    // フルスクリーンローディング表示
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                </div>
                <p className="mt-6 text-white text-lg font-medium">ログイン中...</p>
                <p className="mt-2 text-slate-400 text-sm">しばらくお待ちください</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-slate-900/50 border-slate-800">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">管理者ログイン</CardTitle>
                    <p className="text-sm text-slate-400 mt-1">Kakiuchi FX 管理システム</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">メールアドレス</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@kakiuchi-fx.com"
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">パスワード</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700">
                            {isLoading ? "ログイン中..." : "管理者ログイン"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
