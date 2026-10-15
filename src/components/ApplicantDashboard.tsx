"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchFacilities, fetchMyApplicant } from "@/lib/data";
import {
  CARE_LEVELS,
  CITIES,
  FACILITY_TYPES,
  FACILITY_TYPE_CODES,
  MOVE_IN,
  SERVICES,
  SERVICE_CODES,
  type Applicant,
  type Facility,
  type InquiryStatus,
} from "@/lib/domain";
import { formatDate, formatManYen } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { rankFacilities } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import FacilityCard from "./FacilityCard";
import { Card, ChipGroup, DemoNote, Field, Skeleton, StatusBadge, Tag, Toast, Toggle, inputClass } from "./ui";

type MyInquiry = {
  id: string;
  status: InquiryStatus;
  created_at: string;
  facility: { id: string; name: string } | null;
};
const BUDGETS = [100_000, 120_000, 140_000, 160_000, 180_000, 200_000, 220_000, 250_000, 300_000, 350_000];

export default function ApplicantDashboard() {
  const now = useNow();
  const [me, setMe] = useState<Applicant | null | undefined>(undefined);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [inquiries, setInquiries] = useState<MyInquiry[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Applicant | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchMyApplicant(), fetchFacilities()]).then(async ([a, fs]) => {
      setMe(a);
      setFacilities(fs);
      if (!a) return;
      const { data } = await supabase
        .from("inquiries")
        .select("id, status, created_at, facility:facilities(id, name)")
        .eq("applicant_id", a.id)
        .order("created_at", { ascending: false });
      setInquiries((data as unknown as MyInquiry[]) ?? []);
    });
  }, []);

  const ranked = useMemo(() => (me ? rankFacilities(facilities, me) : []), [facilities, me]);
  const eligible = ranked.filter((r) => r.match.eligible);
  const others = ranked.filter((r) => !r.match.eligible);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("applicants")
      .update({
        care_level: draft.care_level,
        preferred_cities: draft.preferred_cities,
        budget_max: draft.budget_max,
        needs_welfare: draft.needs_welfare,
        required_services: draft.required_services,
        preferred_types: draft.preferred_types,
        move_in: draft.move_in,
        note: draft.note,
      })
      .eq("id", draft.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setToast(`保存できませんでした：${error.message}`);
    } else {
      setMe(data as Applicant);
      setEditing(false);
      setToast("条件を保存しました。おすすめの施設を更新しました");
    }
    setTimeout(() => setToast(null), 3500);
  };

  if (me === undefined)
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  if (me === null) return <p className="p-6 text-sm text-slate-600">入居希望者の情報が見つかりません。</p>;

  const set = <K extends keyof Applicant>(key: K, value: Applicant[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold text-teal-700">入居希望者のページ</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{me.name}さん</h1>
        <p className="text-xs text-slate-500">
          {me.age}歳・ご家族が登録・連絡先 {me.contact}（相談した施設にだけ開示されます）
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* 希望条件 */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">入居の希望条件</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setDraft(me);
                  setEditing(true);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                条件を変更
              </button>
            )}
          </div>

          {!editing || !draft ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-3">
              {[
                ["介護度", CARE_LEVELS[me.care_level]],
                ["月額の予算", `${formatManYen(me.budget_max)}まで`],
                ["生活保護", me.needs_welfare ? "受給中" : "なし"],
                ["希望の地域", me.preferred_cities.join("、") || "指定なし"],
                ["入居の時期", MOVE_IN[me.move_in]],
                ["施設の種類", me.preferred_types.map((t) => FACILITY_TYPES[t].short).join("、") || "指定なし"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-slate-400">{k}</dt>
                  <dd className="font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 md:col-span-3">
                <dt className="text-[11px] text-slate-400">必要な医療・ケア</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {me.required_services.length ? (
                    me.required_services.map((s) => (
                      <Tag key={s} tone="teal">
                        {SERVICES[s]}
                      </Tag>
                    ))
                  ) : (
                    <span className="font-semibold text-slate-800">特になし</span>
                  )}
                </dd>
              </div>
              {me.note && (
                <div className="col-span-2 md:col-span-3">
                  <dt className="text-[11px] text-slate-400">ご家族からのメモ</dt>
                  <dd className="text-slate-700">{me.note}</dd>
                </div>
              )}
            </dl>
          ) : (
            <form onSubmit={save} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Field label="介護度">
                  <select
                    value={draft.care_level}
                    onChange={(e) => set("care_level", Number(e.target.value))}
                    className={inputClass}
                  >
                    {CARE_LEVELS.map((l, i) => (
                      <option key={l} value={i}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="月額の予算">
                  <select
                    value={draft.budget_max}
                    onChange={(e) => set("budget_max", Number(e.target.value))}
                    className={inputClass}
                  >
                    {BUDGETS.map((b) => (
                      <option key={b} value={b}>
                        {formatManYen(b)}まで
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="入居の時期">
                  <select
                    value={draft.move_in}
                    onChange={(e) => set("move_in", e.target.value as Applicant["move_in"])}
                    className={inputClass}
                  >
                    {Object.entries(MOVE_IN).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Toggle
                checked={draft.needs_welfare}
                onChange={(v) => set("needs_welfare", v)}
                label="生活保護を受給している"
              />
              <Field label="希望の地域" hint="複数選択可。選ばなければ全地域">
                <ChipGroup
                  label="希望の地域"
                  options={CITIES.map((c) => ({ value: c, label: c }))}
                  value={draft.preferred_cities}
                  onChange={(v) => set("preferred_cities", v)}
                />
              </Field>
              <Field label="必要な医療・ケア">
                <ChipGroup
                  label="必要な医療・ケア"
                  options={SERVICE_CODES.map((s) => ({ value: s, label: SERVICES[s] }))}
                  value={draft.required_services}
                  onChange={(v) => set("required_services", v)}
                />
              </Field>
              <Field label="施設の種類" hint="選ばなければすべて">
                <ChipGroup
                  label="施設の種類"
                  options={FACILITY_TYPE_CODES.map((t) => ({ value: t, label: FACILITY_TYPES[t].short }))}
                  value={draft.preferred_types}
                  onChange={(v) => set("preferred_types", v)}
                />
              </Field>
              <Field label="ご家族からのメモ">
                <textarea
                  value={draft.note}
                  onChange={(e) => set("note", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </Field>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 flex-1 rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? "保存中…" : "保存して施設を探し直す"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                >
                  やめる
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* 相談の状況 */}
        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">相談した施設</h2>
          {inquiries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">まだ相談はありません。施設のページから申し込めます。</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {inquiries.map((i) => (
                <li key={i.id} className="py-2.5">
                  <Link
                    href={`/facilities/${i.facility?.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                  >
                    {i.facility?.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <StatusBadge status={i.status} />
                    {formatDate(i.created_at)}に相談
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* おすすめの施設 */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            条件に合う施設 <span className="text-teal-700">{eligible.length}件</span>
          </h2>
          <p className="text-xs text-slate-500">
            点数は、希望条件のうち満たしている割合です。✕の項目は合わない条件です。
          </p>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {eligible.map(({ facility, match }) => (
            <FacilityCard key={facility.id} facility={facility} match={match} now={now} />
          ))}
        </div>
        {others.length > 0 && (
          <details className="group mt-5">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-500 hover:text-slate-800 [&::-webkit-details-marker]:hidden">
              必須の条件に合わない施設 {others.length}件を表示
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {others.map(({ facility, match }) => (
                <FacilityCard key={facility.id} facility={facility} match={match} now={now} />
              ))}
            </div>
          </details>
        )}
      </section>
      <DemoNote />
      <Toast message={toast} />
    </div>
  );
}
