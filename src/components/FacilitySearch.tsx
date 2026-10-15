"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_CENTER } from "@/config";
import { useAuth } from "@/lib/auth";
import { fetchFacilities, fetchMyApplicant } from "@/lib/data";
import {
  CARE_LEVELS,
  CITIES,
  FACILITY_TYPES,
  FACILITY_TYPE_CODES,
  SERVICES,
  SERVICE_CODES,
  type Applicant,
  type Facility,
} from "@/lib/domain";
import { formatFeeRange, formatManYen } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { matchFacility } from "@/lib/matching";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filtersFromConditions,
  matchesFilters,
  type SearchFilters,
} from "@/lib/search";
import FacilityCard from "./FacilityCard";
import type { MapPoint } from "./FacilityMap";
import { ChipGroup, DemoNote, Field, ListIcon, MapIcon, Skeleton, Toggle, UserIcon } from "./ui";

const FacilityMap = dynamic(() => import("./FacilityMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
});

type Sort = "match" | "vacancy" | "fee";
const BUDGETS = [100_000, 130_000, 150_000, 180_000, 200_000, 250_000, 300_000, 350_000];
const COLORS = { vacancy: "#0d9488", full: "#94a3b8", out: "#cbd5e1" };

export default function FacilitySearch() {
  const now = useNow();
  const { profile } = useAuth();
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Applicant | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("vacancy");
  const [view, setView] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFacilities()
      .then(setFacilities)
      .catch((e: Error) => setError(e.message));
  }, []);

  // 入居希望者としてログインしていれば、登録した条件との照合を出す
  useEffect(() => {
    if (profile?.role !== "applicant") return;
    fetchMyApplicant().then((a) => {
      setMe(a);
      if (a) setSort("match");
    });
  }, [profile]);

  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const results = useMemo(() => {
    if (!facilities) return [];
    const rows = facilities
      .filter((f) => matchesFilters(f, filters))
      .map((f) => ({ facility: f, match: me ? matchFacility(f, me) : undefined }));
    return rows.sort((a, b) => {
      if (sort === "match" && a.match && b.match) {
        return (
          Number(b.match.eligible) - Number(a.match.eligible) ||
          b.match.score - a.match.score ||
          b.facility.vacancies - a.facility.vacancies
        );
      }
      if (sort === "fee") return a.facility.monthly_fee_min - b.facility.monthly_fee_min;
      return b.facility.vacancies - a.facility.vacancies || a.facility.monthly_fee_min - b.facility.monthly_fee_min;
    });
  }, [facilities, filters, me, sort]);

  const points: MapPoint[] = useMemo(
    () =>
      results.map(({ facility: f, match }) => ({
        id: f.id,
        label: f.name.split(" ")[0],
        lat: f.lat,
        lng: f.lng,
        color: match && !match.eligible ? COLORS.out : f.vacancies > 0 ? COLORS.vacancy : COLORS.full,
        emphasized: f.vacancies > 0 && (!match || match.eligible),
        flash: false,
        popup: {
          title: f.name,
          status: {
            label: f.vacancies > 0 ? `空室 ${f.vacancies}室` : "満室（空き待ち）",
            color: f.vacancies > 0 ? COLORS.vacancy : COLORS.full,
          },
          lines: [
            `${FACILITY_TYPES[f.facility_type].short}・${f.city}`,
            `月額 ${formatFeeRange(f.monthly_fee_min, f.monthly_fee_max)}`,
            ...(match ? [`あなたの条件との一致：${match.score}点${match.eligible ? "" : "（条件外）"}`] : []),
          ],
          href: `/facilities/${f.id}`,
        },
      })),
    [results],
  );

  const active = countActiveFilters(filters);
  const vacancyTotal = results.reduce((n, r) => n + r.facility.vacancies, 0);

  const filterPanel = (
    <div className="space-y-5">
      {me && (
        <button
          type="button"
          onClick={() => setFilters(filtersFromConditions(me))}
          className="flex w-full items-center gap-2.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-left text-sm font-semibold text-teal-800 hover:bg-teal-100"
        >
          <UserIcon className="h-5 w-5 shrink-0" />
          登録した条件で絞り込む
          <span className="ml-auto text-xs font-medium text-teal-600">{me.name}さん</span>
        </button>
      )}
      <Field label="地域" hint="複数選択可">
        <ChipGroup
          label="地域"
          options={CITIES.map((c) => ({ value: c, label: c }))}
          value={filters.cities}
          onChange={(v) => set("cities", v)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="介護度">
          <select
            value={filters.careLevel ?? ""}
            onChange={(e) => set("careLevel", e.target.value === "" ? null : Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
          >
            <option value="">指定なし</option>
            {CARE_LEVELS.map((l, i) => (
              <option key={l} value={i}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="月額の上限">
          <select
            value={filters.budgetMax ?? ""}
            onChange={(e) => set("budgetMax", e.target.value === "" ? null : Number(e.target.value))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
          >
            <option value="">指定なし</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {formatManYen(b)}まで
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="space-y-2.5">
        <Toggle
          checked={filters.welfareOnly}
          onChange={(v) => set("welfareOnly", v)}
          label="生活保護の方を受け入れる施設"
        />
        <Toggle checked={filters.vacancyOnly} onChange={(v) => set("vacancyOnly", v)} label="空室がある施設だけ" />
      </div>
      <Field label="施設の種類">
        <ChipGroup
          label="施設の種類"
          options={FACILITY_TYPE_CODES.map((t) => ({ value: t, label: FACILITY_TYPES[t].short }))}
          value={filters.types}
          onChange={(v) => set("types", v)}
        />
      </Field>
      <Field label="必要な医療・ケア" hint="すべてに対応する施設">
        <ChipGroup
          label="必要な医療・ケア"
          options={SERVICE_CODES.map((s) => ({ value: s, label: SERVICES[s] }))}
          value={filters.services}
          onChange={(v) => set("services", v)}
        />
      </Field>
      {active > 0 && (
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          条件をすべて解除
        </button>
      )}
    </div>
  );

  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,0.9fr)]">
      {/* 絞り込み */}
      <aside className="border-b border-slate-200 bg-white md:min-h-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">施設を探す</h1>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 md:hidden"
              aria-expanded={showFilters}
            >
              絞り込み{active > 0 ? `（${active}）` : ""}
            </button>
          </div>
          <div className={`${showFilters ? "block" : "hidden"} mt-4 md:block`}>{filterPanel}</div>
        </div>
      </aside>

      {/* 結果 */}
      <section className={`min-h-0 md:overflow-y-auto ${view === "map" ? "hidden xl:block" : ""}`}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
          <p className="text-sm text-slate-600">
            <span className="text-lg font-bold text-slate-900">{facilities ? results.length : "—"}</span>件
            <span className="ml-2 text-xs text-slate-500">空室 合計{vacancyTotal}室</span>
          </p>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="並び順"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
            >
              {me && <option value="match">条件に合う順</option>}
              <option value="vacancy">空室が多い順</option>
              <option value="fee">月額が安い順</option>
            </select>
            <button
              type="button"
              onClick={() => setView("map")}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 xl:hidden"
            >
              <MapIcon className="h-4 w-4" />
              地図
            </button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {error && <p className="text-sm text-red-700">読み込めませんでした：{error}</p>}
          {!facilities && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}
          {facilities && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              条件に合う施設がありません。条件を減らしてみてください。
            </div>
          )}
          {results.map(({ facility, match }) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              match={match}
              now={now}
              selected={selectedId === facility.id}
              onSelect={() => setSelectedId(facility.id)}
            />
          ))}
          <DemoNote className="pt-2" />
        </div>
      </section>

      {/* 地図 */}
      <section
        className={`relative h-[calc(100dvh-3.5rem)] md:col-start-2 md:h-auto xl:col-start-3 ${view === "map" ? "" : "hidden xl:block"}`}
      >
        <FacilityMap
          points={points}
          center={DEFAULT_CENTER}
          selectedId={selectedId}
          onSelect={setSelectedId}
          fitToPoints
        />
        <div className="pointer-events-none absolute bottom-8 left-3 z-10 flex items-center gap-3 rounded-full bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow-md ring-1 ring-slate-900/5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.vacancy }} />
            空室あり
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.full }} />
            満室
          </span>
        </div>
        <button
          type="button"
          onClick={() => setView("list")}
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-md xl:hidden"
        >
          <ListIcon className="h-4 w-4" />
          一覧に戻る
        </button>
      </section>
    </div>
  );
}
