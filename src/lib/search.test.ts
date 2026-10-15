import { describe, expect, it } from "vitest";
import type { Facility } from "./domain";
import { EMPTY_FILTERS, countActiveFilters, filtersFromConditions, matchesFilters } from "./search";

const f: Pick<
  Facility,
  | "city"
  | "care_level_min"
  | "care_level_max"
  | "monthly_fee_min"
  | "accepts_welfare"
  | "vacancies"
  | "facility_type"
  | "services"
> = {
  city: "杉並区",
  care_level_min: 3,
  care_level_max: 7,
  monthly_fee_min: 150_000,
  accepts_welfare: true,
  vacancies: 0,
  facility_type: "group_home",
  services: ["dementia", "end_of_life"],
};

describe("matchesFilters", () => {
  it("条件なしならすべて表示する", () => {
    expect(matchesFilters(f, EMPTY_FILTERS)).toBe(true);
  });

  it("地域で絞り込む", () => {
    expect(matchesFilters(f, { ...EMPTY_FILTERS, cities: ["杉並区", "練馬区"] })).toBe(true);
    expect(matchesFilters(f, { ...EMPTY_FILTERS, cities: ["町田市"] })).toBe(false);
  });

  it("介護度が受け入れ範囲かで絞り込む", () => {
    expect(matchesFilters(f, { ...EMPTY_FILTERS, careLevel: 3 })).toBe(true);
    expect(matchesFilters(f, { ...EMPTY_FILTERS, careLevel: 2 })).toBe(false);
  });

  it("最低月額が予算以内かで絞り込む", () => {
    expect(matchesFilters(f, { ...EMPTY_FILTERS, budgetMax: 150_000 })).toBe(true);
    expect(matchesFilters(f, { ...EMPTY_FILTERS, budgetMax: 140_000 })).toBe(false);
  });

  it("生活保護への対応と空室で絞り込む", () => {
    expect(matchesFilters(f, { ...EMPTY_FILTERS, welfareOnly: true })).toBe(true);
    expect(matchesFilters({ ...f, accepts_welfare: false }, { ...EMPTY_FILTERS, welfareOnly: true })).toBe(false);
    expect(matchesFilters(f, { ...EMPTY_FILTERS, vacancyOnly: true })).toBe(false);
  });

  it("必要な医療・ケアは、すべてに対応している施設だけを残す", () => {
    expect(matchesFilters(f, { ...EMPTY_FILTERS, services: ["dementia"] })).toBe(true);
    expect(matchesFilters(f, { ...EMPTY_FILTERS, services: ["dementia", "suction"] })).toBe(false);
  });

  it("施設の種類で絞り込む", () => {
    expect(matchesFilters(f, { ...EMPTY_FILTERS, types: ["group_home"] })).toBe(true);
    expect(matchesFilters(f, { ...EMPTY_FILTERS, types: ["tokuyo"] })).toBe(false);
  });
});

describe("filtersFromConditions / countActiveFilters", () => {
  it("登録した条件を検索の絞り込みに置き換える", () => {
    const s = filtersFromConditions({
      care_level: 5,
      preferred_cities: ["世田谷区"],
      budget_max: 200_000,
      needs_welfare: false,
      required_services: ["dementia"],
      preferred_types: [],
    });
    expect(s).toMatchObject({
      cities: ["世田谷区"],
      careLevel: 5,
      budgetMax: 200_000,
      welfareOnly: false,
      services: ["dementia"],
    });
    expect(countActiveFilters(s)).toBe(4);
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });
});
