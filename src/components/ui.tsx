"use client";

import type { ReactNode, SVGProps } from "react";
import { FACILITY_TYPES, INQUIRY_STATUS, type FacilityType, type InquiryStatus } from "@/lib/domain";
import type { MatchResult } from "@/lib/matching";

// ---------------------------------------------------------------------------
// アイコン（線画。外部ライブラリを増やさないよう、使う分だけ定義する）
// ---------------------------------------------------------------------------
type IconProps = SVGProps<SVGSVGElement>;
function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}
export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const CrossIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 7 7 17M7 7l10 10" />
  </Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);
export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);
export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Icon>
);
export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Icon>
);
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 5 6v5.5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);
export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12Z" />
  </Icon>
);
export const BedIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 18V7M3 14h18v4M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5" />
    <circle cx="7" cy="11" r="1.8" />
  </Icon>
);
export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </Icon>
);
export const MapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 4-5.5 2v14L9 18l6 2 5.5-2V4L15 6z" />
    <path d="M9 4v14M15 6v14" />
  </Icon>
);
export const LogoutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  </Icon>
);

// ---------------------------------------------------------------------------
// 表示の部品
// ---------------------------------------------------------------------------
const TYPE_TONE: Record<FacilityType, string> = {
  tokuyo: "bg-sky-50 text-sky-700 ring-sky-600/20",
  roken: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  kaigo_yuryo: "bg-teal-50 text-teal-700 ring-teal-600/20",
  jutaku_yuryo: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  sakoju: "bg-amber-50 text-amber-800 ring-amber-600/20",
  group_home: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function TypeBadge({ type }: { type: FacilityType }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TYPE_TONE[type]}`}
      title={FACILITY_TYPES[type].label}
    >
      {FACILITY_TYPES[type].short}
    </span>
  );
}

export function VacancyBadge({ vacancies, capacity }: { vacancies: number; capacity?: number }) {
  return vacancies > 0 ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold text-white">
      空室 {vacancies}室{capacity ? <span className="font-medium text-teal-100">／定員{capacity}</span> : null}
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
      満室（空き待ち）
    </span>
  );
}

export function Tag({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "teal" | "amber" }) {
  const cls = {
    slate: "bg-slate-100 text-slate-600",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-800",
  }[tone];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: InquiryStatus }) {
  const s = INQUIRY_STATUS[status];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_TONE[s.tone]}`}
    >
      {s.label}
    </span>
  );
}

/** マッチングの点数。条件外なら灰色 */
export function ScoreBadge({ match, size = "md" }: { match: MatchResult; size?: "md" | "lg" }) {
  const big = size === "lg";
  const color = !match.eligible ? "text-slate-400" : match.score >= 90 ? "text-teal-700" : "text-teal-600";
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center ${big ? "w-20" : "w-14"}`}>
      <span className={`${big ? "text-3xl" : "text-xl"} font-bold tabular-nums leading-none ${color}`}>
        {match.score}
        <span className="text-[11px] font-semibold">点</span>
      </span>
      <span className={`mt-1 text-[10px] font-semibold ${match.eligible ? "text-teal-700" : "text-slate-400"}`}>
        {match.eligible ? "条件に合う" : "条件外"}
      </span>
    </div>
  );
}

/** 条件ごとの合う／合わない */
export function CriteriaList({ match, compact }: { match: MatchResult; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {match.criteria.map((c) => (
          <span
            key={c.key}
            title={c.detail}
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
              c.ok
                ? "bg-teal-50 text-teal-800"
                : c.required
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {c.ok ? <CheckIcon className="h-3 w-3" /> : <CrossIcon className="h-3 w-3" />}
            {c.label}
          </span>
        ))}
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {match.criteria.map((c) => (
        <li key={c.key} className="flex items-start gap-2 text-sm">
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
              c.ok ? "bg-teal-600 text-white" : c.required ? "bg-rose-500 text-white" : "bg-slate-300 text-white"
            }`}
          >
            {c.ok ? <CheckIcon className="h-3.5 w-3.5" /> : <CrossIcon className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0">
            <span className="font-semibold text-slate-800">{c.label}</span>
            {c.required && <span className="ml-1 text-[10px] font-semibold text-slate-400">必須</span>}
            <span className="block text-xs text-slate-500">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 選択式のチップ（複数選択） */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              on
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-teal-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
      {label}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[92vw] items-center gap-2 rounded-full bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-xl"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-teal-400" />
      {message}
    </div>
  );
}

export function DemoNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-slate-400 ${className}`}>
      デモ版です。施設名、住所、電話番号、入居希望者の氏名と連絡先は、すべて架空のものです。
    </p>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 ${className}`} />;
}
