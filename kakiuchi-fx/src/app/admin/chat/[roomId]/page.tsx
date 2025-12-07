"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface Message {
    id: string
    content: string
    senderType: "USER" | "ADMIN"
    createdAt: string
    isRead: boolean
}

interface ChatRoom {
    id: string
    status: string
    user: {
        name: string
        email: string
    }
    messages: Message[]
}

export default function AdminChatDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
    const router = useRouter()
    const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
    const [newMessage, setNewMessage] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [roomId, setRoomId] = useState<string>("")

    useEffect(() => {
        params.then(p => setRoomId(p.roomId))
    }, [params])

    useEffect(() => {
        if (!roomId) return
        fetchChatRoom()
        const interval = setInterval(fetchChatRoom, 3000)
        return () => clearInterval(interval)
    }, [roomId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [chatRoom?.messages])

    const fetchChatRoom = async () => {
        if (!roomId) return
        try {
            const response = await fetch(`/api/admin/chat/${roomId}`)
            if (response.ok) {
                const data = await response.json()
                setChatRoom(data.chatRoom)
            }
        } catch (error) {
            console.error("Failed to fetch chat:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || isSending) return

        setIsSending(true)
        try {
            const response = await fetch(`/api/admin/chat/${roomId}/messages`, {
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

    const updateStatus = async (status: string) => {
        try {
            await fetch(`/api/admin/chat/${roomId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })
            fetchChatRoom()
        } catch (error) {
            console.error("Failed to update status:", error)
        }
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    if (!chatRoom) {
        return (
            <div className="text-center py-16">
                <p className="text-slate-400">チャットルームが見つかりません</p>
            </div>
        )
    }

    return (
        <div className="space-y-4 h-[calc(100vh-120px)]">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/chat" className="text-slate-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{chatRoom.user.name}</h1>
                        <p className="text-slate-400 text-sm">{chatRoom.user.email}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {chatRoom.status === "OPEN" && (
                        <Button
                            onClick={() => updateStatus("RESOLVED")}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            解決済みにする
                        </Button>
                    )}
                    {chatRoom.status === "RESOLVED" && (
                        <Button
                            onClick={() => updateStatus("OPEN")}
                            variant="outline"
                        >
                            再オープン
                        </Button>
                    )}
                </div>
            </div>

            {/* チャットエリア */}
            <Card className="bg-slate-900/50 border-slate-800 flex flex-col h-[calc(100%-80px)]">
                <CardContent className="flex-1 flex flex-col p-0">
                    {/* メッセージ */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                        {chatRoom.messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${message.senderType === "ADMIN"
                                        ? "bg-purple-600 text-white rounded-br-md"
                                        : "bg-slate-700 text-white rounded-bl-md"
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    <p className={`text-xs mt-1 ${message.senderType === "ADMIN" ? "text-purple-200" : "text-slate-400"
                                        }`}>
                                        {formatTime(message.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 入力 */}
                    <div className="border-t border-slate-800 p-4">
                        <form onSubmit={sendMessage} className="flex gap-3">
                            <Input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="返信を入力..."
                                disabled={isSending}
                                className="flex-1 bg-slate-800 border-slate-700 text-white"
                            />
                            <Button type="submit" disabled={!newMessage.trim() || isSending}>
                                送信
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
