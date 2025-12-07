"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
    id: string
    content: string
    senderType: "USER" | "ADMIN"
    createdAt: string
    isRead: boolean
}

interface ChatRoom {
    id: string
    subject: string | null
    status: string
    messages: Message[]
}

export default function SupportPage() {
    const { data: session } = useSession()
    const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
    const [newMessage, setNewMessage] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // チャットルームを取得/作成
    useEffect(() => {
        fetchChatRoom()
        // ポーリングで新着メッセージを取得（5秒ごと）
        const interval = setInterval(fetchChatRoom, 5000)
        return () => clearInterval(interval)
    }, [])

    // メッセージ追加時に自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [chatRoom?.messages])

    const fetchChatRoom = async () => {
        try {
            const response = await fetch("/api/chat")
            if (response.ok) {
                const data = await response.json()
                setChatRoom(data.chatRoom)
            }
        } catch (error) {
            console.error("Failed to fetch chat room:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || isSending) return

        setIsSending(true)
        try {
            const response = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newMessage }),
            })

            if (response.ok) {
                setNewMessage("")
                fetchChatRoom()
            }
        } catch (error) {
            console.error("Failed to send message:", error)
        } finally {
            setIsSending(false)
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6 h-[calc(100vh-120px)]">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">サポート</h1>
                {chatRoom?.status === "RESOLVED" && (
                    <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">
                        解決済み
                    </span>
                )}
            </div>

            <Card className="bg-slate-900/50 border-slate-800 flex flex-col h-[calc(100%-80px)]">
                <CardHeader className="border-b border-slate-800">
                    <CardTitle className="text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        カスタマーサポート
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                    {/* メッセージエリア */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        {chatRoom?.messages && chatRoom.messages.length > 0 ? (
                            <>
                                {chatRoom.messages.map((message, index) => {
                                    const showDate = index === 0 ||
                                        formatDate(message.createdAt) !== formatDate(chatRoom.messages[index - 1].createdAt)

                                    return (
                                        <div key={message.id}>
                                            {showDate && (
                                                <div className="flex justify-center my-4">
                                                    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400">
                                                        {formatDate(message.createdAt)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${message.senderType === "USER" ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${message.senderType === "USER"
                                                        ? "bg-blue-600 text-white rounded-br-md"
                                                        : "bg-slate-700 text-white rounded-bl-md"
                                                    }`}>
                                                    {message.senderType === "ADMIN" && (
                                                        <p className="text-xs text-blue-300 mb-1">サポート担当</p>
                                                    )}
                                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                    <p className={`text-xs mt-1 ${message.senderType === "USER" ? "text-blue-200" : "text-slate-400"
                                                        }`}>
                                                        {formatTime(message.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="text-slate-400">メッセージを送信してサポートに問い合わせましょう</p>
                                    <p className="text-slate-500 text-sm mt-1">通常24時間以内に返信いたします</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 入力エリア */}
                    <div className="border-t border-slate-800 p-4">
                        <form onSubmit={sendMessage} className="flex gap-3">
                            <Input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="メッセージを入力..."
                                disabled={isSending || chatRoom?.status === "CLOSED"}
                                className="flex-1 bg-slate-800 border-slate-700 text-white"
                            />
                            <Button
                                type="submit"
                                disabled={!newMessage.trim() || isSending || chatRoom?.status === "CLOSED"}
                            >
                                {isSending ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
