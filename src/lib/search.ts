import type { Conditions, Facility, FacilityType, ServiceCode } from "./domain.ts";

/** 施設検索の絞り込み条件。空の項目は絞り込みに使わない */
export type SearchFilters = {
  cities: string[];
  careLevel: number | null;
  budgetMax: number | null;
  welfareOnly: boolean;
  vacancyOnly: boolean;
  types: FacilityType[];
  services: ServiceCode[];
};

export const EMPTY_FILTERS: SearchFilters = {
  cities: [],
  careLevel: null,
  budgetMax: null,
  welfareOnly: false,
  vacancyOnly: false,
  types: [],
  services: [],
};

type SearchableFacility = Pick<
  Facility,
  | "city"
  | "care_level_min"
  | "care_level_max"
  | "monthly_fee_min"
  | "accepts_welfare"
  | "vacancies"
  | "facility_type"
  | "services"
>;

export function matchesFilters(f: SearchableFacility, s: SearchFilters): boolean {
  if (s.cities.length > 0 && !s.cities.includes(f.city)) return false;
  if (s.careLevel !== null && (s.careLevel < f.care_level_min || s.careLevel > f.care_level_max)) return false;
  if (s.budgetMax !== null && f.monthly_fee_min > s.budgetMax) return false;
  if (s.welfareOnly && !f.accepts_welfare) return false;
  if (s.vacancyOnly && f.vacancies <= 0) return false;
  if (s.types.length > 0 && !s.types.includes(f.facility_type)) return false;
  if (!s.services.every((x) => f.services.includes(x))) return false;
  return true;
}

/** 入居希望者の登録条件を、検索の絞り込みに置き換える（地域は希望が多いと絞りすぎるので、そのまま使う） */
export function filtersFromConditions(c: Conditions): SearchFilters {
  return {
    cities: c.preferred_cities,
    careLevel: c.care_level,
    budgetMax: c.budget_max,
    welfareOnly: c.needs_welfare,
    vacancyOnly: false,
    types: c.preferred_types,
    services: c.required_services,
  };
}

export function countActiveFilters(s: SearchFilters): number {
  return (
    (s.cities.length > 0 ? 1 : 0) +
    (s.careLevel !== null ? 1 : 0) +
    (s.budgetMax !== null ? 1 : 0) +
    (s.welfareOnly ? 1 : 0) +
    (s.vacancyOnly ? 1 : 0) +
    (s.types.length > 0 ? 1 : 0) +
    (s.services.length > 0 ? 1 : 0)
  );
}
