# ケアマッチ（デモ版）

介護施設の空室情報と、入居希望者の条件をつなぐマッチングシステムのデモ版です。

> 施設名、住所、電話番号、入居希望者の氏名と連絡先は、すべて架空のものです。

## できること

| 立場 | 画面 | 内容 |
|---|---|---|
| だれでも | `/search` | 地域、介護度、月額の上限、生活保護への対応、空室、施設の種類、必要な医療・ケアで施設を検索。一覧と地図で表示 |
| だれでも | `/facilities/[id]` | 施設の費用、受け入れる介護度、医療・ケアへの対応、空室、地図 |
| 入居希望者 | `/applicant` | 希望条件の登録と変更、条件に合う施設を点数順に表示（条件ごとに合う／合わないを表示）、相談した施設と状況 |
| 入居希望者 | `/facilities/[id]` | その施設との照合結果、相談の申し込み |
| 施設担当者 | `/facility` | 空室数の更新、施設情報の編集、届いた相談への対応、条件に合う入居希望者の一覧（匿名） |
| 管理者 | `/admin` | 全体の数字、施設の一覧（空室の更新、掲載の停止）、入居希望者の一覧（合う施設がない方を表示）、相談の一覧 |

トップページの「〇〇として試す」を押すと、デモ用アカウントでそのままログインします。

## マッチングの考え方（[src/lib/matching.ts](src/lib/matching.ts)）

- **必須の条件**：介護度、月額費用（最低月額が予算以内）、生活保護への対応、必要な医療・ケア。一つでも合わなければ「条件外」
- **希望の条件**：地域、空室、施設の種類。合わなければ点数が下がる
- **点数**：条件ごとの重みのうち、満たした分の割合（0〜100）。希望が指定されていない条件は計算に入れない
- 画面では、条件ごとに「合う／合わない」と理由を表示する

## 個人情報の扱い

- 入居希望者の氏名と連絡先は、本人と管理者、そして**本人が相談した施設にだけ**見えます。
- 施設担当者が見られるのは、匿名の番号と希望条件だけです（データベースの関数 `anonymous_applicants`）。
- 権限はすべてデータベースの Row Level Security と関数で制御しています。画面の表示を変えても、権限のないデータは取得できません。

## 技術構成

Next.js（App Router、TypeScript）、Tailwind CSS、Supabase（PostgreSQL、Auth、RLS）、MapLibre GL JS ＋ OpenFreeMap（APIキー不要の地図）、Vercel。

```
supabase/migrations/   データベースの定義（テーブル、RLS、関数）
supabase/seed.sql      デモ用データ（scripts/generate-seed.mts で生成）
scripts/db-setup.mts   スキーマ、デモ用データ、デモ用アカウントを Supabase に入れる
scripts/test-db.mts    データベースのテスト（PGlite で実行）
src/lib/matching.ts    マッチングの計算
src/lib/search.ts      検索の絞り込み
src/lib/domain.ts      施設の種類、介護度、医療・ケアなどのコードと表示名
```

## ローカルでの起動

```bash
npm install
cp .env.example .env.local   # Supabase の値を入れる
npm run db:setup             # 初回だけ
npm run dev                  # http://localhost:3000
```

デモ用データを初期状態に戻すときは `npm run db:reset`。

## テスト

```bash
npm test          # マッチング、検索の絞り込み、表示の整形（Vitest）
npm run test:db   # マイグレーション、シード、RLS、業務の関数（PGlite）
npm run lint
```
