import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate, getStatusColor } from "@/lib/utils"
import Link from "next/link"

export default async function AdminChatPage() {
    const chatRooms = await prisma.chatRoom.findMany({
        orderBy: [
            { status: "asc" }, // OPEN優先
            { updatedAt: "desc" },
        ],
        include: {
            user: {
                select: { name: true, email: true },
            },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            _count: {
                select: {
                    messages: { where: { isRead: false, senderType: "USER" } },
                },
            },
        },
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">チャット管理</h1>
                <p className="text-slate-400 mt-1">
                    未対応: {chatRooms.filter(r => r.status === "OPEN").length}件
                </p>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">チャット一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    {chatRooms.length > 0 ? (
                        <div className="space-y-3">
                            {chatRooms.map((room) => (
                                <Link
                                    key={room.id}
                                    href={`/admin/chat/${room.id}`}
                                    className="block"
                                >
                                    <div className={`p-4 rounded-lg border transition-colors hover:bg-slate-800/50 ${room.status === "OPEN"
                                            ? "bg-purple-500/5 border-purple-500/30"
                                            : "bg-slate-800/30 border-slate-700"
                                        }`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-white">{room.user.name}</h3>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(room.status)}`}>
                                                        {room.status === "OPEN" ? "未対応" : translateStatus(room.status)}
                                                    </span>
                                                    {room._count.messages > 0 && (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                                                            {room._count.messages}件未読
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400">{room.user.email}</p>

                                                {room.messages[0] && (
                                                    <div className="mt-2 p-2 bg-slate-800/50 rounded">
                                                        <p className="text-sm text-slate-300 line-clamp-2">
                                                            {room.messages[0].senderType === "USER" ? "" : "管理者: "}
                                                            {room.messages[0].content}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm text-slate-400">
                                                    {formatDate(room.updatedAt)}
                                                </p>
                                                <svg className="w-5 h-5 text-slate-500 mt-2 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-slate-400">チャットはありません</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
