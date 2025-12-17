import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { translateStatus, formatDate, getStatusColor, ID_DOCUMENT_TYPES, ADDRESS_DOCUMENT_TYPES } from "@/lib/utils"
import { KycActionButtons } from "@/app/admin/kyc/kyc-actions"

export default async function AdminKycPage() {
    // 審査待ちのユーザーを取得（SUBMITTED優先）
    const users = await prisma.user.findMany({
        where: {
            kycStatus: { in: ["SUBMITTED", "PENDING", "REJECTED"] },
        },
        orderBy: [
            { kycStatus: "asc" }, // SUBMITTED が先
            { kycSubmittedAt: "asc" },
        ],
        include: {
            accounts: {
                select: { accountNumber: true },
            },
        },
    })

    const getDocumentLabel = (type: string | null, types: readonly { value: string; label: string }[]) => {
        if (!type) return "---"
        return types.find(t => t.value === type)?.label || type
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">KYC審査</h1>
                <p className="text-slate-400 mt-1">本人確認書類の審査を行います</p>
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">
                        審査対象 ({users.filter(u => u.kycStatus === "SUBMITTED").length}件)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {users.length > 0 ? (
                        <div className="space-y-4">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className={`p-4 rounded-lg border ${user.kycStatus === "SUBMITTED"
                                        ? "bg-yellow-500/5 border-yellow-500/30"
                                        : "bg-slate-800/50 border-slate-700"
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(user.kycStatus)}`}>
                                                    {translateStatus(user.kycStatus)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-slate-400">メール</p>
                                                    <p className="text-white">{user.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400">口座番号</p>
                                                    <p className="text-white font-mono">{user.accounts[0]?.accountNumber || "---"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400">申請日時</p>
                                                    <p className="text-white">{user.kycSubmittedAt ? formatDate(user.kycSubmittedAt) : "---"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400">電話番号</p>
                                                    <p className="text-white">{user.phone || "未登録"}</p>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-slate-700 mt-2">
                                                <p className="text-sm text-slate-400 mb-1">住所</p>
                                                <p className="text-white">
                                                    〒{user.postalCode || "---"} {user.prefecture}{user.city}{user.address1} {user.address2}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-slate-400">身分証明書</p>
                                                    <p className="text-white">{getDocumentLabel(user.idDocumentType, ID_DOCUMENT_TYPES)}</p>
                                                    {user.idDocumentUrl && (
                                                        <a
                                                            href={user.idDocumentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-2 block"
                                                        >
                                                            <img
                                                                src={user.idDocumentUrl}
                                                                alt="身分証明書"
                                                                className="w-32 h-20 object-cover rounded border border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
                                                            />
                                                            <span className="text-xs text-blue-400 hover:underline">画像を確認</span>
                                                        </a>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-400">住所確認書類</p>
                                                    <p className="text-white">{getDocumentLabel(user.addressDocumentType, ADDRESS_DOCUMENT_TYPES)}</p>
                                                    {user.addressDocumentUrl && (
                                                        <a
                                                            href={user.addressDocumentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-2 block"
                                                        >
                                                            <img
                                                                src={user.addressDocumentUrl}
                                                                alt="住所確認書類"
                                                                className="w-32 h-20 object-cover rounded border border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
                                                            />
                                                            <span className="text-xs text-blue-400 hover:underline">画像を確認</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {user.kycRejectedReason && (
                                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                                                    <p className="text-sm text-red-400 font-medium">前回の却下理由:</p>
                                                    <p className="text-white text-sm">{user.kycRejectedReason}</p>
                                                </div>
                                            )}
                                        </div>

                                        {user.kycStatus === "SUBMITTED" && (
                                            <KycActionButtons userId={user.id} />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p className="text-slate-400">審査待ちの申請はありません</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
