# Kakiuchi FX Trading Platform

海外FXブローカー向けトレーディングプラットフォーム

## 機能一覧

### 顧客向け機能
- **ダッシュボード** - 口座残高、証拠金、損益の確認
- **取引画面** - GBPUSDのリアルタイムチャートと注文機能
- **ウォレット** - USDT入金・出金・履歴の統合管理
- **ポジション管理** - 保有ポジションの確認と決済
- **KYC認証** - 本人確認書類のアップロード
- **サポート** - 管理者とのチャットサポート

### 管理者向け機能
- **管理ダッシュボード** - 統計概要
- **ユーザー管理** - 顧客一覧・詳細
- **KYC審査** - 本人確認書類の審査・承認・却下
- **入出金管理** - USDT入金承認・出金処理（金額修正機能付き）
- **ポジション管理** - 全顧客のポジション一覧
- **チャットサポート** - 顧客とのコミュニケーション
- **システム設定** - スプレッド・スワップ設定

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router, Turbopack)
- **言語**: TypeScript
- **データベース**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **認証**: NextAuth v5
- **スタイリング**: Tailwind CSS v4
- **チャート**: Lightweight Charts v5
- **リアルタイム**: WebSocket

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集

# データベースのマイグレーション
npx prisma db push

# デモデータの投入
npx tsx prisma/seed.ts

# 開発サーバーの起動
npm run dev
```

## 環境変数

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000"
```

## ログイン情報

### 管理者
- **URL**: http://localhost:3000/admin-login
- **メール**: admin@kakiuchi-fx.com
- **パスワード**: admin123

### デモユーザー
- **URL**: http://localhost:3000/login
- **メール**: tanaka@example.com
- **パスワード**: demo1234

## 2024/12/18 アップデート内容

### 通貨・設定変更
- 💵 **USD口座対応** - 円建てからドル建てに変更
- 📊 **ロットサイズ修正** - 1ロット = 100,000通貨（業界標準）
- ⚡ **デフォルトレバレッジ** - 100倍から200倍に変更

### USDT入出金システム
- 🪙 **入金フロー** - ステップ形式（申請→ウォレットアドレス表示→TxHash入力）
- 💸 **出金フロー** - ウォレットアドレス＆ネットワーク選択（TRC20/ERC20）
- 📜 **履歴表示** - 申請履歴とステータス確認
- 🔗 **統合ウォレットページ** - 入金・出金・履歴をタブで切り替え

### 管理者機能強化
- 🔐 **管理者ログイン分離** - `/admin-login`で専用ログイン画面
- 💰 **入金金額修正機能** - 承認時に金額を修正可能
- 🖼️ **KYC画像プレビュー** - 審査画面で書類画像を確認
- 📝 **デモデータ** - ユーザー5人、入出金履歴、チャットデータ

### 技術的修正
- ✅ Vercelデプロイ対応（Prisma generate自動実行）
- ✅ TypeScriptビルドエラー修正
- ✅ Suspenseでのクライアントコンポーネント対応

## ディレクトリ構成

```
src/
├── app/
│   ├── (dashboard)/      # 顧客向けページ
│   │   ├── dashboard/    # ダッシュボード
│   │   ├── trade/        # 取引画面
│   │   ├── wallet/       # ウォレット（入金/出金/履歴）
│   │   └── ...
│   ├── admin/            # 管理者向けページ
│   │   ├── transactions/ # 入出金管理
│   │   ├── kyc/          # KYC審査
│   │   └── ...
│   ├── admin-login/      # 管理者ログイン
│   ├── login/            # 顧客ログイン
│   └── api/              # APIエンドポイント
├── components/           # 共通コンポーネント
└── lib/                  # ユーティリティ
```

## ライセンス

Private - All rights reserved
