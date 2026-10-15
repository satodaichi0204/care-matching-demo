// 施設と入居希望者の条件を照らし合わせる。
// 「なぜ合うのか、何が合わないのか」を条件ごとに返し、画面でそのまま見せられるようにしている。
//
// - 必須の条件（介護度、費用、生活保護、必要な医療・ケア）が一つでも合わなければ「条件外」
// - 点数は、条件ごとの重みのうち満たした分の割合（0〜100）
// - 希望が指定されていない条件（地域や種類が空など）は、点数の計算に入れない

import { CARE_LEVELS, FACILITY_TYPES, SERVICES, type Conditions, type Facility } from "./domain.ts";
import { formatManYen } from "./format.ts";

export type CriterionKey = "care_level" | "budget" | "welfare" | "services" | "city" | "vacancy" | "type";

export type Criterion = {
  key: CriterionKey;
  label: string;
  ok: boolean;
  /** 必須の条件か（合わなければ条件外） */
  required: boolean;
  weight: number;
  detail: string;
};

export type MatchResult = {
  score: number;
  eligible: boolean;
  criteria: Criterion[];
};

export const WEIGHTS: Record<CriterionKey, number> = {
  care_level: 20,
  budget: 20,
  welfare: 15,
  services: 15,
  city: 15,
  vacancy: 10,
  type: 5,
};

type MatchableFacility = Pick<
  Facility,
  | "facility_type"
  | "city"
  | "monthly_fee_min"
  | "monthly_fee_max"
  | "care_level_min"
  | "care_level_max"
  | "accepts_welfare"
  | "services"
  | "vacancies"
>;

export function matchFacility(f: MatchableFacility, c: Conditions): MatchResult {
  const criteria: Criterion[] = [];

  const careOk = c.care_level >= f.care_level_min && c.care_level <= f.care_level_max;
  criteria.push({
    key: "care_level",
    label: "介護度",
    ok: careOk,
    required: true,
    weight: WEIGHTS.care_level,
    detail: careOk
      ? `${CARE_LEVELS[c.care_level]}を受け入れ`
      : `受け入れは${CARE_LEVELS[f.care_level_min]}〜${CARE_LEVELS[f.care_level_max]}`,
  });

  const budgetOk = f.monthly_fee_min <= c.budget_max;
  criteria.push({
    key: "budget",
    label: "月額費用",
    ok: budgetOk,
    required: true,
    weight: WEIGHTS.budget,
    detail: budgetOk
      ? f.monthly_fee_max <= c.budget_max
        ? `予算内（${formatManYen(f.monthly_fee_min)}〜）`
        : `プランにより予算内（${formatManYen(f.monthly_fee_min)}〜）`
      : `最低${formatManYen(f.monthly_fee_min)}で予算${formatManYen(c.budget_max)}を超える`,
  });

  if (c.needs_welfare) {
    criteria.push({
      key: "welfare",
      label: "生活保護",
      ok: f.accepts_welfare,
      required: true,
      weight: WEIGHTS.welfare,
      detail: f.accepts_welfare ? "生活保護の方を受け入れ" : "生活保護の受け入れなし",
    });
  }

  if (c.required_services.length > 0) {
    const missing = c.required_services.filter((s) => !f.services.includes(s));
    criteria.push({
      key: "services",
      label: "医療・ケア",
      ok: missing.length === 0,
      required: true,
      weight: WEIGHTS.services,
      detail:
        missing.length === 0
          ? `${c.required_services.map((s) => SERVICES[s]).join("、")}に対応`
          : `${missing.map((s) => SERVICES[s]).join("、")}に未対応`,
    });
  }

  if (c.preferred_cities.length > 0) {
    const ok = c.preferred_cities.includes(f.city);
    criteria.push({
      key: "city",
      label: "地域",
      ok,
      required: false,
      weight: WEIGHTS.city,
      detail: ok ? `希望の${f.city}` : `${f.city}（希望地域の外）`,
    });
  }

  criteria.push({
    key: "vacancy",
    label: "空室",
    ok: f.vacancies > 0,
    required: false,
    weight: WEIGHTS.vacancy,
    detail: f.vacancies > 0 ? `空室${f.vacancies}室` : "満室（空き待ち）",
  });

  if (c.preferred_types.length > 0) {
    const ok = c.preferred_types.includes(f.facility_type);
    criteria.push({
      key: "type",
      label: "施設の種類",
      ok,
      required: false,
      weight: WEIGHTS.type,
      detail: ok
        ? `希望の${FACILITY_TYPES[f.facility_type].short}`
        : `${FACILITY_TYPES[f.facility_type].short}（希望外）`,
    });
  }

  const total = criteria.reduce((sum, x) => sum + x.weight, 0);
  const got = criteria.reduce((sum, x) => sum + (x.ok ? x.weight : 0), 0);
  return {
    score: Math.round((got / total) * 100),
    eligible: criteria.every((x) => !x.required || x.ok),
    criteria,
  };
}

/** 条件に合う順に並べる（条件外は後ろ。同点なら空室の多い順） */
export function rankFacilities<F extends MatchableFacility>(facilities: F[], c: Conditions) {
  return facilities
    .map((facility) => ({ facility, match: matchFacility(facility, c) }))
    .sort(
      (a, b) =>
        Number(b.match.eligible) - Number(a.match.eligible) ||
        b.match.score - a.match.score ||
        b.facility.vacancies - a.facility.vacancies,
    );
}
