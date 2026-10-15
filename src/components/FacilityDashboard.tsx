"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchFacility } from "@/lib/data";
import {
  CARE_LEVELS,
  FACILITY_TYPES,
  INQUIRY_STATUS,
  INQUIRY_STATUS_CODES,
  MOVE_IN,
  SERVICES,
  SERVICE_CODES,
  type Facility,
  type FacilityType,
  type InquiryStatus,
  type MoveIn,
  type ServiceCode,
} from "@/lib/domain";
import { formatDate, formatManYen, formatUpdated } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { matchFacility } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import {
  BedIcon,
  Card,
  ChatIcon,
  ChipGroup,
  CriteriaList,
  DemoNote,
  Field,
  ScoreBadge,
  ShieldIcon,
  Skeleton,
  StatusBadge,
  Tag,
  Toast,
  Toggle,
  TypeBadge,
  inputClass,
} from "./ui";

type Received = {
  id: string;
  status: InquiryStatus;
  message: string;
  created_at: string;
  applicant_name: string;
  applicant_age: number | null;
  applicant_contact: string | null;
  care_level: number;
  preferred_cities: string[];
  budget_max: number;
  needs_welfare: boolean;
  required_services: ServiceCode[];
  move_in: MoveIn;
};

type AnonApplicant = {
  code: string;
  age_group: string;
  care_level: number;
  preferred_cities: string[];
  budget_max: number;
  needs_welfare: boolean;
  required_services: ServiceCode[];
  preferred_types: FacilityType[];
  move_in: MoveIn;
};

export default function FacilityDashboard() {
  const now = useNow();
  const { profile } = useAuth();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [received, setReceived] = useState<Received[]>([]);
  const [anon, setAnon] = useState<AnonApplicant[]>([]);
  const [draft, setDraft] = useState<Facility | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!profile?.facility_id) return;
    Promise.all([
      fetchFacility(profile.facility_id),
      supabase.rpc("received_inquiries"),
      supabase.rpc("anonymous_applicants"),
    ]).then(([f, r, a]) => {
      setFacility(f);
      setDraft(f);
      setReceived((r.data as Received[]) ?? []);
      setAnon((a.data as AnonApplicant[]) ?? []);
    });
  }, [profile]);

  const candidates = useMemo(
    () =>
      facility
        ? anon
            .map((a) => ({ applicant: a, match: matchFacility(facility, a) }))
            .filter((x) => x.match.eligible)
            .sort((x, y) => y.match.score - x.match.score)
        : [],
    [anon, facility],
  );

  if (!facility || !draft)
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );

  const adjust = async (delta: number) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("adjust_vacancy", { p_facility_id: facility.id, p_delta: delta });
    setBusy(false);
    if (error) return showToast(error.message);
    const row = data as Facility;
    setFacility(row);
    setDraft((d) => (d ? { ...d, vacancies: row.vacancies } : d));
    showToast(`空室を ${facility.vacancies} → ${row.vacancies}室に更新しました。検索結果にもすぐ反映されます`);
  };

  const changeStatus = async (id: string, status: InquiryStatus) => {
    const { error } = await supabase.rpc("set_inquiry_status", { p_inquiry_id: id, p_status: status });
    if (error) return showToast(error.message);
    setReceived((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    showToast(`状況を「${INQUIRY_STATUS[status].label}」にしました`);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.monthly_fee_max < draft.monthly_fee_min) return showToast("月額の上限は下限以上にしてください");
    if (draft.care_level_max < draft.care_level_min) return showToast("介護度の範囲が正しくありません");
    setBusy(true);
    const { data, error } = await supabase
      .from("facilities")
      .update({
        monthly_fee_min: draft.monthly_fee_min,
        monthly_fee_max: draft.monthly_fee_max,
        admission_fee: draft.admission_fee,
        care_level_min: draft.care_level_min,
        care_level_max: draft.care_level_max,
        accepts_welfare: draft.accepts_welfare,
        services: draft.services,
        capacity: draft.capacity,
        description: draft.description,
      })
      .eq("id", facility.id)
      .select("*")
      .single();
    setBusy(false);
    if (error) return showToast(`保存できませんでした：${error.message}`);
    setFacility(data as Facility);
    showToast("施設情報を保存しました");
  };

  const set = <K extends keyof Facility>(key: K, value: Facility[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  const newCount = received.filter((r) => r.status === "new").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-teal-700">施設担当者のページ</p>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            {facility.name}
            <TypeBadge type={facility.facility_type} />
          </h1>
          <p className="text-xs text-slate-500">
            {FACILITY_TYPES[facility.facility_type].label}・{facility.city}
          </p>
        </div>
        <Link
          href={`/facilities/${facility.id}`}
          target="_blank"
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          利用者から見たページ →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* 空室 */}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <BedIcon className="h-5 w-5 text-teal-600" />
              空室数
            </h2>
            <div className="mt-4 flex items-center justify-center gap-6">
              <button
                type="button"
                disabled={busy || facility.vacancies <= 0}
                onClick={() => adjust(-1)}
                aria-label="空室を1つ減らす"
                className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-3xl font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95 disabled:opacity-30"
              >
                −
              </button>
              <div className="text-center">
                <div className="text-5xl font-bold tabular-nums tracking-tight text-slate-900">
                  {facility.vacancies}
                </div>
                <div className="mt-1 text-xs text-slate-400">室／定員 {facility.capacity}名</div>
              </div>
              <button
                type="button"
                disabled={busy || facility.vacancies >= facility.capacity}
                onClick={() => adjust(1)}
                aria-label="空室を1つ増やす"
                className="grid h-14 w-14 place-items-center rounded-full bg-teal-600 text-3xl font-bold text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-700 active:scale-95 disabled:opacity-30"
              >
                ＋
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">{formatUpdated(facility.vacancy_updated_at, now)}</p>
          </Card>

          {/* 施設情報の編集 */}
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">施設情報の編集</h2>
            <form onSubmit={save} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="月額（下限）" hint="円">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={draft.monthly_fee_min}
                    onChange={(e) => set("monthly_fee_min", Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="月額（上限）" hint="円">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={draft.monthly_fee_max}
                    onChange={(e) => set("monthly_fee_max", Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="入居時の費用" hint="円">
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={draft.admission_fee}
                    onChange={(e) => set("admission_fee", Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="定員" hint="名">
                  <input
                    type="number"
                    min={1}
                    value={draft.capacity}
                    onChange={(e) => set("capacity", Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="介護度（下限）">
                  <select
                    value={draft.care_level_min}
                    onChange={(e) => set("care_level_min", Number(e.target.value))}
                    className={inputClass}
                  >
                    {CARE_LEVELS.map((l, i) => (
                      <option key={l} value={i}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="介護度（上限）">
                  <select
                    value={draft.care_level_max}
                    onChange={(e) => set("care_level_max", Number(e.target.value))}
                    className={inputClass}
                  >
                    {CARE_LEVELS.map((l, i) => (
                      <option key={l} value={i}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Toggle
                checked={draft.accepts_welfare}
                onChange={(v) => set("accepts_welfare", v)}
                label="生活保護の方を受け入れる"
              />
              <Field label="対応できる医療・ケア">
                <ChipGroup
                  label="対応できる医療・ケア"
                  options={SERVICE_CODES.map((s) => ({ value: s, label: SERVICES[s] }))}
                  value={draft.services}
                  onChange={(v) => set("services", v)}
                />
              </Field>
              <Field label="施設の紹介">
                <textarea
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </Field>
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-slate-900 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                保存する
              </button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {/* 届いた相談 */}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ChatIcon className="h-5 w-5 text-teal-600" />
              届いた相談
              {newCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                  新規 {newCount}
                </span>
              )}
            </h2>
            {received.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">まだ相談はありません。</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {received.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">
                          {r.applicant_name}さん
                          <span className="ml-1 text-sm font-normal text-slate-500">（{r.applicant_age}歳）</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.applicant_contact}・{formatDate(r.created_at)}に相談
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <select
                          value={r.status}
                          onChange={(e) => changeStatus(r.id, e.target.value as InquiryStatus)}
                          aria-label="相談の状況"
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                        >
                          {INQUIRY_STATUS_CODES.map((s) => (
                            <option key={s} value={s}>
                              {INQUIRY_STATUS[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {r.message && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">{r.message}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Tag>{CARE_LEVELS[r.care_level]}</Tag>
                      <Tag>予算 {formatManYen(r.budget_max)}</Tag>
                      <Tag>{MOVE_IN[r.move_in]}</Tag>
                      {r.needs_welfare && <Tag tone="amber">生活保護</Tag>}
                      {r.required_services.map((s) => (
                        <Tag key={s} tone="teal">
                          {SERVICES[s]}
                        </Tag>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 条件に合う入居希望者（匿名） */}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldIcon className="h-5 w-5 text-teal-600" />
              この施設の条件に合う入居希望者 <span className="text-teal-700">{candidates.length}名</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              個人を特定できないよう、氏名と連絡先は表示しません。入居希望者が相談すると、その方の情報が「届いた相談」に表示されます。
            </p>
            <ul className="mt-3 divide-y divide-slate-100">
              {candidates.map(({ applicant: a, match }) => (
                <li key={a.code} className="flex gap-3 py-3">
                  <ScoreBadge match={match} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {a.code}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {a.age_group}・{CARE_LEVELS[a.care_level]}・予算 {formatManYen(a.budget_max)}・
                        {MOVE_IN[a.move_in]}
                      </span>
                    </p>
                    <div className="mt-1.5">
                      <CriteriaList match={match} compact />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <DemoNote />
      <Toast message={toast} />
    </div>
  );
}
