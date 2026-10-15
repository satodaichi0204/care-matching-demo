"use client";

import Link from "next/link";
import { SERVICES, type Facility } from "@/lib/domain";
import { formatCareRange, formatFeeRange, formatUpdated } from "@/lib/format";
import type { MatchResult } from "@/lib/matching";
import { ChevronRightIcon, CriteriaList, PinIcon, ScoreBadge, Tag, TypeBadge, VacancyBadge } from "./ui";

export default function FacilityCard({
  facility: f,
  match,
  now,
  selected,
  onSelect,
}: {
  facility: Facility;
  match?: MatchResult;
  now: Date;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <article
      className={`relative rounded-2xl border bg-white p-4 shadow-sm transition ${
        selected ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-300 hover:shadow-md"
      } ${match && !match.eligible ? "opacity-75" : ""}`}
    >
      <div className="flex gap-3">
        {match && <ScoreBadge match={match} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={f.facility_type} />
            <VacancyBadge vacancies={f.vacancies} />
            {f.accepts_welfare && <Tag tone="amber">生活保護 可</Tag>}
          </div>
          <h3 className="mt-1.5 text-base font-bold leading-snug text-slate-900">
            <Link href={`/facilities/${f.id}`} className="after:absolute after:inset-0 hover:text-teal-700">
              {f.name}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <PinIcon className="h-3.5 w-3.5" />
            {f.city}
            <span className="text-slate-300">・</span>
            {formatUpdated(f.vacancy_updated_at, now).replace("更新", "空室を更新")}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm">
            <div>
              <dt className="text-[11px] text-slate-400">月額の目安</dt>
              <dd className="font-semibold text-slate-800">{formatFeeRange(f.monthly_fee_min, f.monthly_fee_max)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">受け入れる介護度</dt>
              <dd className="font-semibold text-slate-800">{formatCareRange(f.care_level_min, f.care_level_max)}</dd>
            </div>
          </dl>
          {match ? (
            <div className="relative mt-2.5">
              <CriteriaList match={match} compact />
            </div>
          ) : (
            f.services.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {f.services.slice(0, 4).map((s) => (
                  <Tag key={s} tone="teal">
                    {SERVICES[s]}
                  </Tag>
                ))}
                {f.services.length > 4 && <Tag>ほか{f.services.length - 4}件</Tag>}
              </div>
            )
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between">
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              className="relative z-10 hidden rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 md:block"
            >
              地図で見る
            </button>
          ) : (
            <span />
          )}
          <ChevronRightIcon className="h-5 w-5 text-slate-300" />
        </div>
      </div>
    </article>
  );
}
