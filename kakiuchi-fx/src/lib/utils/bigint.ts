// BigInt Conversion Utilities
// すべての金額・価格・数量はBigIntで管理（浮動小数点誤差を完全回避）

// 乗数定義
export const PRICE_MULTIPLIER = 10000n;  // 価格用 (188.1234 → 1881234n)
export const AMOUNT_MULTIPLIER = 100n;   // 金額用 (1234.56円 → 123456n)
export const LOT_MULTIPLIER = 1000n;     // ロット用 (0.01ロット → 10n)
export const SPREAD_MULTIPLIER = 10n;    // スプレッド用（0.1pips単位）

// 1ロット = 100,000 GBP（業界標準）
export const LOT_SIZE = 100000n;

// ============================================
// 価格変換
// ============================================

/**
 * 数値価格をBigIntに変換
 * @example priceToBigInt(188.1234) → 1881234n
 */
export function priceToBigInt(price: number): bigint {
    return BigInt(Math.round(price * 10000));
}

/**
 * BigInt価格を数値に変換
 * @example bigIntToPrice(1881234n) → 188.1234
 */
export function bigIntToPrice(value: bigint): number {
    return Number(value) / 10000;
}

/**
 * 価格を表示用にフォーマット
 * @example formatPrice(1881234n) → "188.123"
 */
export function formatPrice(value: bigint, decimals: number = 3): string {
    return bigIntToPrice(value).toFixed(decimals);
}

// ============================================
// 金額変換
// ============================================

/**
 * 数値金額をBigIntに変換
 * @example amountToBigInt(1234.56) → 123456n
 */
export function amountToBigInt(amount: number): bigint {
    return BigInt(Math.round(amount * 100));
}

/**
 * BigInt金額を数値に変換
 * @example bigIntToAmount(123456n) → 1234.56
 */
export function bigIntToAmount(value: bigint): number {
    return Number(value) / 100;
}

/**
 * 金額を表示用にフォーマット（USD）
 * @example formatAmount(123456n) → "$1,234.56"
 */
export function formatAmount(value: bigint, showDollar: boolean = true): string {
    const amount = bigIntToAmount(value);
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
    return showDollar ? `$${formatted}` : formatted;
}

/**
 * 金額を整数表示用にフォーマット（小数点なし）
 */
export function formatAmountInteger(value: bigint): string {
    const amount = Math.floor(bigIntToAmount(value));
    return new Intl.NumberFormat('en-US').format(amount);
}

// ============================================
// ロット変換
// ============================================

/**
 * 数値ロットをBigIntに変換
 * @example lotToBigInt(0.01) → 10n
 */
export function lotToBigInt(lot: number): bigint {
    return BigInt(Math.round(lot * 1000));
}

/**
 * BigIntロットを数値に変換
 * @example bigIntToLot(10n) → 0.01
 */
export function bigIntToLot(value: bigint): number {
    return Number(value) / 1000;
}

/**
 * ロットを表示用にフォーマット
 * @example formatLot(10n) → "0.01"
 */
export function formatLot(value: bigint): string {
    return bigIntToLot(value).toFixed(2);
}

// ============================================
// 損益計算
// ============================================

/**
 * 未実現損益を計算
 * @param side ポジションの方向 ('BUY' or 'SELL')
 * @param quantity ロット数 (×1000) 例: 0.01ロット = 10n
 * @param entryPrice エントリー価格 (×10000) 例: 188.489 = 1884890n
 * @param currentPrice 現在価格 (×10000、BUYならBid、SELLならAsk)
 * @returns 損益 (×100、円) 例: ¥5.80 = 580n
 */
export function calculateUnrealizedPnl(
    side: 'BUY' | 'SELL',
    quantity: bigint,
    entryPrice: bigint,
    currentPrice: bigint
): bigint {
    const priceDiff = side === 'BUY'
        ? currentPrice - entryPrice
        : entryPrice - currentPrice;

    // PnL (円) = 価格差 × (ロット数/1000) × ロットサイズ
    // PnL (×100) = priceDiff/10000 × quantity/1000 × LOT_SIZE × 100
    //            = priceDiff × quantity × LOT_SIZE × 100 / (10000 × 1000)
    //            = priceDiff × quantity × LOT_SIZE / 100000
    const pnl = (priceDiff * quantity * LOT_SIZE) / 100000n;
    return pnl;  // ×100された金額
}

// ============================================
// 証拠金計算
// ============================================

/**
 * 必要証拠金を計算
 * @param quantity ロット数 (×1000)
 * @param price 価格 (×10000)
 * @param leverage レバレッジ倍率
 * @returns 必要証拠金 (×100、円)
 */
export function calculateRequiredMargin(
    quantity: bigint,
    price: bigint,
    leverage: number
): bigint {
    // 必要証拠金 = (ロット数 × ロットサイズ × 価格) / レバレッジ
    // = (quantity/1000 × 10000 × price/10000) / leverage × 100
    const margin = (quantity * LOT_SIZE * price) /
        (LOT_MULTIPLIER * BigInt(leverage));
    return margin;  // 結果は×100された金額
}

/**
 * 証拠金維持率を計算
 * @param equity 有効証拠金 (×100)
 * @param usedMargin 使用中証拠金 (×100)
 * @returns 維持率（%）
 */
export function calculateMarginLevel(
    equity: bigint,
    usedMargin: bigint
): number {
    if (usedMargin === 0n) return Infinity;
    return (Number(equity) / Number(usedMargin)) * 100;
}

/**
 * ロスカット判定
 * @param marginLevel 証拠金維持率（%）
 * @param threshold ロスカット水準（デフォルト20%）
 */
export function shouldLiquidate(marginLevel: number, threshold: number = 20): boolean {
    return marginLevel <= threshold;
}

// ============================================
// スプレッド適用
// ============================================

/**
 * スプレッドを適用した価格を計算
 * @param rawBid FIXから取得した生のBid (×10000)
 * @param rawAsk FIXから取得した生のAsk (×10000)
 * @param spreadMarkup 管理者設定値（0.1pips単位、例: 5 = 0.5pips）
 * @returns スプレッド適用後のBid/Ask
 */
export function applySpread(
    rawBid: bigint,
    rawAsk: bigint,
    spreadMarkup: number
): { bid: bigint; ask: bigint } {
    // 1pip = 0.01円 = 1 (×10000表記)
    // 0.1pip = 0.001円 = 0.1 (×10000表記) → 整数化のため×10で保存
    const spreadAdjustment = BigInt(spreadMarkup);  // 0.1pips単位

    return {
        bid: rawBid - spreadAdjustment,  // Bidを下げる
        ask: rawAsk + spreadAdjustment,  // Askを上げる
    };
}

// ============================================
// JSON シリアライズ対応
// ============================================

/**
 * BigIntを含むオブジェクトをJSONにシリアライズ
 */
export function serializeBigInt<T>(obj: T): string {
    return JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
}

/**
 * BigInt文字列を含むJSONをパース（指定キーをBigIntに変換）
 */
export function parseBigInt<T>(
    json: string,
    bigIntKeys: string[] = []
): T {
    return JSON.parse(json, (key, value) => {
        if (bigIntKeys.includes(key) && typeof value === 'string') {
            return BigInt(value);
        }
        return value;
    });
}
