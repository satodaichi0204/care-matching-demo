import Link from "next/link";
import DemoAccounts from "@/components/DemoAccounts";
import { BedIcon, ChatIcon, DemoNote, SearchIcon, ShieldIcon } from "@/components/ui";

const FEATURES = [
  {
    icon: BedIcon,
    title: "空室をその場で更新",
    body: "施設担当者がスマートフォンから空室数を増減。検索結果と施設ページに、すぐに反映されます。",
  },
  {
    icon: SearchIcon,
    title: "条件で施設を探す",
    body: "地域、介護度、月額費用、生活保護への対応、必要な医療・ケアで絞り込み。一覧と地図で確認できます。",
  },
  {
    icon: ChatIcon,
    title: "理由が見えるマッチング",
    body: "希望条件に合う施設を点数順に表示。条件ごとに「合う／合わない」を示すので、なぜ合うのかが分かります。",
  },
  {
    icon: ShieldIcon,
    title: "個人情報を守る設計",
    body: "施設が見られるのは、匿名化された希望条件だけ。氏名と連絡先は、本人が相談した施設にだけ開示されます。",
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12">
      <section className="text-center">
        <p className="text-sm font-semibold text-teal-700">介護施設と入居希望者のマッチング</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          空室の情報と、入居の希望を
          <br className="sm:hidden" />
          つなぐ
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
          施設は空室と受け入れ条件を登録し、入居を希望する方は条件を登録します。条件に合う施設を点数順に表示し、そのまま相談を申し込めます。
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700"
          >
            <SearchIcon className="h-5 w-5" />
            ログインせずに施設を探す
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] tracking-wider text-amber-800">DEMO</span>
          3つの立場で試せます（押すとそのままログイン）
        </h2>
        <DemoAccounts />
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <f.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      <DemoNote className="mt-10 text-center" />
    </div>
  );
}
