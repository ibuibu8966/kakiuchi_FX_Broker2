import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * 遅延処理
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 口座番号を生成
 * @returns 8桁の口座番号（例: "10001234"）
 */
export function generateAccountNumber(): string {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `1${timestamp}${random}`.slice(0, 8);
}

/**
 * 日付をフォーマット
 */
export function formatDate(date: Date | string, includeTime: boolean = true): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit',
        }),
    };
    return new Intl.DateTimeFormat('ja-JP', options).format(d);
}

/**
 * ステータスバッジの色を取得
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        // KYC
        PENDING: 'bg-yellow-100 text-yellow-800',
        SUBMITTED: 'bg-blue-100 text-blue-800',
        VERIFIED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        // Account
        ACTIVE: 'bg-green-100 text-green-800',
        SUSPENDED: 'bg-orange-100 text-orange-800',
        CLOSED: 'bg-gray-100 text-gray-800',
        // Order
        FILLED: 'bg-green-100 text-green-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
        EXPIRED: 'bg-gray-100 text-gray-800',
        // Position
        OPEN: 'bg-blue-100 text-blue-800',
        LIQUIDATED: 'bg-red-100 text-red-800',
        // Transaction
        APPROVED: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-green-100 text-green-800',
        // Chat
        RESOLVED: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * ステータス名の日本語変換
 */
export function translateStatus(status: string): string {
    const translations: Record<string, string> = {
        // KYC
        PENDING: '未提出',
        SUBMITTED: '審査中',
        VERIFIED: '承認済み',
        REJECTED: '却下',
        // Account
        ACTIVE: 'アクティブ',
        SUSPENDED: '停止中',
        CLOSED: '閉鎖',
        // Order
        FILLED: '約定',
        CANCELLED: 'キャンセル',
        EXPIRED: '期限切れ',
        // Position
        OPEN: '保有中',
        LIQUIDATED: 'ロスカット',
        // Transaction
        DEPOSIT: '入金',
        WITHDRAWAL: '出金',
        APPROVED: '承認済み',
        COMPLETED: '完了',
        // Chat
        RESOLVED: '解決済み',
        // Order Side
        BUY: '買い',
        SELL: '売り',
        // Order Type
        MARKET: '成行',
        LIMIT: '指値',
        STOP: '逆指値',
    };
    return translations[status] || status;
}

/**
 * レバレッジの選択肢
 */
export const LEVERAGE_OPTIONS = [25, 50, 100, 200, 500] as const;

/**
 * KYCの身分証明書種類
 */
export const ID_DOCUMENT_TYPES = [
    { value: 'DRIVERS_LICENSE', label: '運転免許証' },
    { value: 'PASSPORT', label: 'パスポート' },
    { value: 'MY_NUMBER_CARD', label: 'マイナンバーカード' },
    { value: 'RESIDENCE_CARD', label: '在留カード' },
] as const;

/**
 * KYCの住所確認書類種類
 */
export const ADDRESS_DOCUMENT_TYPES = [
    { value: 'UTILITY_BILL', label: '公共料金請求書' },
    { value: 'BANK_STATEMENT', label: '銀行取引明細' },
    { value: 'TAX_DOCUMENT', label: '住民税決定通知書' },
    { value: 'RESIDENCE_CERT', label: '住民票' },
] as const;
