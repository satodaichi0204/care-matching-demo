"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchFacilities } from "@/lib/data";
import {
  CARE_LEVELS,
  INQUIRY_STATUS,
  INQUIRY_STATUS_CODES,
  type Applicant,
  type Facility,
  type InquiryStatus,
} from "@/lib/domain";
import { formatDate, formatFeeRange, formatManYen, formatUpdated } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { matchFacility } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import { Card, DemoNote, Skeleton, StatusBadge, Toast, Toggle, TypeBadge } from "./ui";

type InquiryRow = {
  id: string;
  facility_id: string;
  facility_name: string;
  applicant_name: string;
  status: InquiryStatus;
  created_at: string;
};
type Tab = "facilities" | "applicants" | "inquiries";

export default function AdminDashboard() {
  const now = useNow();
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [tab, setTab] = useState<Tab>("facilities");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      fetchFacilities(),
      supabase.from("applicants").select("*").order("updated_at", { ascending: false }),
      supabase.rpc("received_inquiries"),
    ]).then(([fs, a, i]) => {
      setFacilities(fs);
      setApplicants((a.data as Applicant[]) ?? []);
      setInquiries((i.data as InquiryRow[]) ?? []);
    });
  }, []);

  const eligibleCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applicants) {
      map.set(a.id, (facilities ?? []).filter((f) => f.is_published && matchFacility(f, a).eligible).length);
    }
    return map;
  }, [applicants, facilities]);

  if (!facilities)
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );

  const replace = (row: Facility) => setFacilities((fs) => (fs ?? []).map((f) => (f.id === row.id ? row : f)));

  const adjust = async (f: Facility, delta: number) => {
    const { data, error } = await supabase.rpc("adjust_vacancy", { p_facility_id: f.id, p_delta: delta });
    if (error) return showToast(error.message);
    replace(data as Facility);
  };

  const publish = async (f: Facility, value: boolean) => {
    const { data, error } = await supabase
      .from("facilities")
      .update({ is_published: value })
      .eq("id", f.id)
      .select("*")
      .single();
    if (error) return showToast(error.message);
    replace(data as Facility);
    showToast(value ? `${f.name}の掲載を再開しました` : `${f.name}の掲載を停止しました（検索に出なくなります）`);
  };

  const changeStatus = async (id: string, status: InquiryStatus) => {
    const { error } = await supabase.rpc("set_inquiry_status", { p_inquiry_id: id, p_status: status });
    if (error) return showToast(error.message);
    setInquiries((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const published = facilities.filter((f) => f.is_published);
  const stats = [
    { label: "掲載中の施設", value: `${published.length}`, sub: `全${facilities.length}施設` },
    {
      label: "空室の合計",
      value: `${published.reduce((n, f) => n + f.vacancies, 0)}室`,
      sub: `空室のある施設 ${published.filter((f) => f.vacancies > 0).length}`,
    },
    {
      label: "入居希望者",
      value: `${applicants.length}名`,
      sub: `生活保護 ${applicants.filter((a) => a.needs_welfare).length}名`,
    },
    {
      label: "相談",
      value: `${inquiries.length}件`,
      sub: `新規 ${inquiries.filter((i) => i.status === "new").length}・入居決定 ${inquiries.filter((i) => i.status === "won").length}`,
    },
  ];

  const tabButton = (value: Tab, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      aria-pressed={tab === value}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        tab === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      <span className="ml-1 text-xs font-medium text-slate-400">{count}</span>
    </button>
  );

  const th = "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-slate-500";
  const td = "whitespace-nowrap px-3 py-2.5 text-sm text-slate-700";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold text-violet-700">管理者のページ</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">運営の状況</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {tabButton("facilities", "施設", facilities.length)}
        {tabButton("applicants", "入居希望者", applicants.length)}
        {tabButton("inquiries", "相談", inquiries.length)}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {tab === "facilities" && (
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={th}>施設</th>
                  <th className={th}>地域</th>
                  <th className={th}>空室／定員</th>
                  <th className={th}>月額</th>
                  <th className={th}>介護度</th>
                  <th className={th}>生活保護</th>
                  <th className={th}>空室の更新</th>
                  <th className={th}>掲載</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facilities.map((f) => (
                  <tr key={f.id} className={f.is_published ? "" : "bg-slate-50 opacity-60"}>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <TypeBadge type={f.facility_type} />
                        <Link href={`/facilities/${f.id}`} className="font-semibold text-slate-900 hover:text-teal-700">
                          {f.name}
                        </Link>
                      </div>
                    </td>
                    <td className={td}>{f.city}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjust(f, -1)}
                          disabled={f.vacancies <= 0}
                          aria-label={`${f.name}の空室を減らす`}
                          className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                        >
                          −
                        </button>
                        <span
                          className={`w-14 text-center tabular-nums ${f.vacancies > 0 ? "font-bold text-teal-700" : "text-slate-400"}`}
                        >
                          {f.vacancies}／{f.capacity}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjust(f, 1)}
                          disabled={f.vacancies >= f.capacity}
                          aria-label={`${f.name}の空室を増やす`}
                          className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                        >
                          ＋
                        </button>
                      </div>
                    </td>
                    <td className={td}>{formatFeeRange(f.monthly_fee_min, f.monthly_fee_max)}</td>
                    <td className={td}>
                      {CARE_LEVELS[f.care_level_min]}〜{CARE_LEVELS[f.care_level_max]}
                    </td>
                    <td className={td}>{f.accepts_welfare ? "可" : "－"}</td>
                    <td className={`${td} text-xs text-slate-500`}>
                      {formatUpdated(f.vacancy_updated_at, now).replace("に更新", "").replace("更新", "")}
                    </td>
                    <td className={td}>
                      <Toggle checked={f.is_published} onChange={(v) => publish(f, v)} label="" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "applicants" && (
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={th}>氏名</th>
                  <th className={th}>介護度</th>
                  <th className={th}>希望の地域</th>
                  <th className={th}>予算</th>
                  <th className={th}>生活保護</th>
                  <th className={th}>条件に合う施設</th>
                  <th className={th}>連絡先</th>
                  <th className={th}>更新日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((a) => {
                  const n = eligibleCount.get(a.id) ?? 0;
                  return (
                    <tr key={a.id}>
                      <td className={td}>
                        <span className="font-semibold text-slate-900">{a.name}</span>
                        <span className="ml-1 text-xs text-slate-400">{a.age}歳</span>
                        {a.user_id && (
                          <span className="ml-1.5 rounded bg-teal-50 px-1 text-[10px] font-semibold text-teal-700">
                            ログインあり
                          </span>
                        )}
                      </td>
                      <td className={td}>{CARE_LEVELS[a.care_level]}</td>
                      <td className={td}>{a.preferred_cities.join("、") || "指定なし"}</td>
                      <td className={td}>{formatManYen(a.budget_max)}</td>
                      <td className={td}>{a.needs_welfare ? "受給中" : "－"}</td>
                      <td className={td}>
                        <span className={n === 0 ? "font-bold text-rose-600" : "font-semibold text-teal-700"}>
                          {n}施設
                        </span>
                        {n === 0 && <span className="ml-1 text-[11px] text-rose-500">要フォロー</span>}
                      </td>
                      <td className={`${td} text-xs`}>{a.contact}</td>
                      <td className={`${td} text-xs text-slate-500`}>{formatDate(a.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "inquiries" && (
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={th}>相談日</th>
                  <th className={th}>入居希望者</th>
                  <th className={th}>施設</th>
                  <th className={th}>状況</th>
                  <th className={th}>状況の変更</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inquiries.map((i) => (
                  <tr key={i.id}>
                    <td className={`${td} text-xs text-slate-500`}>{formatDate(i.created_at)}</td>
                    <td className={td}>{i.applicant_name}</td>
                    <td className={td}>
                      <Link href={`/facilities/${i.facility_id}`} className="hover:text-teal-700">
                        {i.facility_name}
                      </Link>
                    </td>
                    <td className={td}>
                      <StatusBadge status={i.status} />
                    </td>
                    <td className={td}>
                      <select
                        value={i.status}
                        onChange={(e) => changeStatus(i.id, e.target.value as InquiryStatus)}
                        aria-label="相談の状況"
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      >
                        {INQUIRY_STATUS_CODES.map((s) => (
                          <option key={s} value={s}>
                            {INQUIRY_STATUS[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <DemoNote />
      <Toast message={toast} />
    </div>
  );
}
