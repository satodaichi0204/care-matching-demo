"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchFacility, fetchMyApplicant } from "@/lib/data";
import {
  CARE_LEVELS,
  FACILITY_TYPES,
  SERVICES,
  SERVICE_CODES,
  type Applicant,
  type Facility,
  type InquiryStatus,
} from "@/lib/domain";
import { formatDate, formatFeeRange, formatManYen, formatUpdated } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { matchFacility } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import {
  Card,
  ChatIcon,
  CheckIcon,
  ChevronLeftIcon,
  CriteriaList,
  DemoNote,
  PinIcon,
  ScoreBadge,
  Skeleton,
  StatusBadge,
  Tag,
  Toast,
  TypeBadge,
  VacancyBadge,
} from "./ui";

const FacilityMap = dynamic(() => import("./FacilityMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
});

type MyInquiry = { id: string; status: InquiryStatus; created_at: string };

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const now = useNow();
  const { profile, loading: authLoading } = useAuth();
  const [facility, setFacility] = useState<Facility | null | undefined>(undefined);
  const [me, setMe] = useState<Applicant | null>(null);
  const [inquiry, setInquiry] = useState<MyInquiry | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchFacility(id)
      .then(setFacility)
      .catch(() => setFacility(null));
  }, [id]);

  useEffect(() => {
    if (profile?.role !== "applicant") return;
    fetchMyApplicant().then(async (a) => {
      setMe(a);
      if (!a) return;
      const { data } = await supabase
        .from("inquiries")
        .select("id, status, created_at")
        .eq("facility_id", id)
        .eq("applicant_id", a.id)
        .maybeSingle();
      setInquiry(data as MyInquiry | null);
    });
  }, [profile, id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    setSending(true);
    const { data, error } = await supabase
      .from("inquiries")
      .insert({ applicant_id: me.id, facility_id: id, message })
      .select("id, status, created_at")
      .single();
    setSending(false);
    if (error) {
      setToast(error.code === "23505" ? "この施設には相談済みです" : `送れませんでした：${error.message}`);
    } else {
      setInquiry(data as MyInquiry);
      setToast("相談を送りました。施設からの連絡をお待ちください");
    }
    setTimeout(() => setToast(null), 3500);
  };

  if (facility === undefined)
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
      </div>
    );
  if (facility === null)
    return (
      <div className="p-6 text-sm">
        施設が見つかりません。
        <Link href="/search" className="ml-2 text-teal-700 underline">
          施設を探す
        </Link>
      </div>
    );

  const f = facility;
  const match = me ? matchFacility(f, me) : null;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <Link
        href="/search"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        施設を探す
      </Link>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* 施設の概要 */}
          <Card className="overflow-hidden">
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <TypeBadge type={f.facility_type} />
                <span className="text-xs text-slate-500">{FACILITY_TYPES[f.facility_type].label}</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{f.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                <PinIcon className="h-4 w-4 text-slate-400" />
                {f.address}
                {f.phone && <span className="ml-2 text-slate-400">TEL {f.phone}</span>}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-teal-50/60 px-4 py-3 ring-1 ring-teal-100">
                <VacancyBadge vacancies={f.vacancies} capacity={f.capacity} />
                <span className="text-xs text-slate-500">
                  {formatUpdated(f.vacancy_updated_at, now).replace("更新", "施設が更新")}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">{f.description}</p>
            </div>
            <div className="h-48 border-t border-slate-200">
              <FacilityMap
                compact
                zoom={13}
                center={{ lat: f.lat, lng: f.lng }}
                points={[
                  {
                    id: f.id,
                    label: f.name,
                    lat: f.lat,
                    lng: f.lng,
                    color: "#0d9488",
                    emphasized: true,
                    flash: false,
                    popup: { title: f.name, lines: [f.address] },
                  },
                ]}
              />
            </div>
          </Card>

          {/* 費用と受け入れ条件 */}
          <Card className="p-5 md:p-6">
            <h2 className="text-base font-bold text-slate-900">費用と受け入れ条件</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["月額の目安", formatFeeRange(f.monthly_fee_min, f.monthly_fee_max)],
                ["入居時の費用", f.admission_fee === 0 ? "なし" : formatManYen(f.admission_fee)],
                ["受け入れる介護度", `${CARE_LEVELS[f.care_level_min]}〜${CARE_LEVELS[f.care_level_max]}`],
                ["生活保護", f.accepts_welfare ? "受け入れ可" : "受け入れなし"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                  <dt className="text-[11px] text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-sm font-bold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-5 text-sm font-bold text-slate-700">医療・ケアへの対応</h3>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-4">
              {SERVICE_CODES.map((s) => {
                const ok = f.services.includes(s);
                return (
                  <li
                    key={s}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      ok ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {ok ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="w-3.5 text-center">－</span>}
                    {SERVICES[s]}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* 入居希望者向け：条件の照合と相談 */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {match && me ? (
            <>
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <ScoreBadge match={match} size="lg" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{me.name}さんの条件との照合</p>
                    <p className="text-xs text-slate-500">
                      {match.eligible ? "必須の条件をすべて満たしています" : "満たしていない必須の条件があります"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <CriteriaList match={match} />
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <ChatIcon className="h-5 w-5 text-teal-600" />
                  この施設に相談する
                </h2>
                {inquiry ? (
                  <div className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
                    <div className="flex items-center gap-2">
                      相談済み <StatusBadge status={inquiry.status} />
                    </div>
                    <p className="mt-1 text-xs text-teal-800/80">
                      {formatDate(inquiry.created_at)}に送信。状況はマイページで確認できます。
                    </p>
                  </div>
                ) : (
                  <form onSubmit={send} className="mt-3 space-y-2">
                    <p className="text-xs leading-relaxed text-slate-500">
                      送ると、この施設にだけ、あなたの氏名と連絡先が開示されます。
                    </p>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="例：母の入居について相談したいです。見学は可能でしょうか。"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="h-11 w-full rounded-xl bg-teal-600 font-semibold text-white shadow-sm shadow-teal-600/30 hover:bg-teal-700 disabled:opacity-60"
                    >
                      {sending ? "送信中…" : "相談を申し込む"}
                    </button>
                  </form>
                )}
              </Card>
            </>
          ) : (
            !authLoading && (
              <Card className="p-5">
                <h2 className="text-base font-bold text-slate-900">入居を検討している方へ</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  入居希望者としてログインすると、登録した条件とこの施設との照合結果を確認し、そのまま相談を申し込めます。
                </p>
                {profile?.role !== "applicant" && (
                  <Link
                    href="/login"
                    className="mt-3 flex h-11 items-center justify-center rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    {profile ? "入居希望者として試す" : "ログインして相談する"}
                  </Link>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  <Tag>定員 {f.capacity}名</Tag>
                  <Tag>{f.city}</Tag>
                </div>
              </Card>
            )
          )}
        </aside>
      </div>
      <DemoNote className="mt-8" />
      <Toast message={toast} />
    </div>
  );
}
