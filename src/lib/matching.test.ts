import { describe, expect, it } from "vitest";
import type { Conditions, Facility } from "./domain";
import { matchFacility, rankFacilities } from "./matching";

const facility = (over: Partial<Facility> = {}): Facility => ({
  id: "f1",
  name: "テスト施設",
  facility_type: "kaigo_yuryo",
  city: "世田谷区",
  address: "",
  lat: 0,
  lng: 0,
  phone: null,
  monthly_fee_min: 180_000,
  monthly_fee_max: 250_000,
  admission_fee: 0,
  care_level_min: 1,
  care_level_max: 7,
  accepts_welfare: false,
  services: ["dementia", "end_of_life"],
  capacity: 40,
  vacancies: 2,
  vacancy_updated_at: "2026-10-15T00:00:00Z",
  description: "",
  is_published: true,
  ...over,
});

const conditions = (over: Partial<Conditions> = {}): Conditions => ({
  care_level: 5,
  preferred_cities: ["世田谷区"],
  budget_max: 200_000,
  needs_welfare: false,
  required_services: ["dementia"],
  preferred_types: [],
  ...over,
});

const byKey = (r: ReturnType<typeof matchFacility>, key: string) => r.criteria.find((c) => c.key === key);

describe("matchFacility", () => {
  it("すべての条件に合えば100点で、条件に合う扱いになる", () => {
    const r = matchFacility(facility(), conditions());
    expect(r.eligible).toBe(true);
    expect(r.score).toBe(100);
    expect(r.criteria.every((c) => c.ok)).toBe(true);
  });

  it("介護度が受け入れ範囲の外なら条件外", () => {
    const r = matchFacility(facility({ care_level_min: 5, care_level_max: 7 }), conditions({ care_level: 3 }));
    expect(r.eligible).toBe(false);
    expect(byKey(r, "care_level")?.ok).toBe(false);
    expect(byKey(r, "care_level")?.detail).toBe("受け入れは要介護3〜要介護5");
  });

  it("最低月額が予算を超えれば条件外。最高月額だけが超える場合は条件内", () => {
    expect(matchFacility(facility({ monthly_fee_min: 210_000 }), conditions()).eligible).toBe(false);
    const partial = matchFacility(facility({ monthly_fee_min: 180_000, monthly_fee_max: 260_000 }), conditions());
    expect(partial.eligible).toBe(true);
    expect(byKey(partial, "budget")?.detail).toContain("プランにより予算内");
  });

  it("生活保護が必要なのに受け入れがなければ条件外。不要なら条件に入れない", () => {
    expect(matchFacility(facility(), conditions({ needs_welfare: true })).eligible).toBe(false);
    expect(matchFacility(facility({ accepts_welfare: true }), conditions({ needs_welfare: true })).eligible).toBe(true);
    expect(byKey(matchFacility(facility(), conditions()), "welfare")).toBeUndefined();
  });

  it("必要な医療・ケアが一つでも欠ければ条件外で、欠けているものを示す", () => {
    const r = matchFacility(facility(), conditions({ required_services: ["dementia", "suction", "oxygen"] }));
    expect(r.eligible).toBe(false);
    expect(byKey(r, "services")?.detail).toBe("喀痰吸引、在宅酸素に未対応");
  });

  it("地域、空室、種類は点数を下げるだけで、条件外にはしない", () => {
    const r = matchFacility(facility({ city: "町田市", vacancies: 0 }), conditions({ preferred_types: ["tokuyo"] }));
    expect(r.eligible).toBe(true);
    // 対象の重みは 介護度20 + 費用20 + 医療・ケア15 + 地域15 + 空室10 + 種類5 = 85。
    // 地域、空室、種類の30を満たさない：55 / 85 = 65点
    expect(r.score).toBe(65);
  });

  it("希望が空の条件は点数の計算に入れない", () => {
    const r = matchFacility(facility({ city: "町田市" }), conditions({ preferred_cities: [], required_services: [] }));
    expect(byKey(r, "city")).toBeUndefined();
    expect(byKey(r, "services")).toBeUndefined();
    expect(r.score).toBe(100);
  });
});

describe("rankFacilities", () => {
  it("条件に合う施設を先に、点数の高い順、同点なら空室の多い順に並べる", () => {
    const list = [
      facility({ id: "out", care_level_min: 7, care_level_max: 7 }),
      facility({ id: "far", city: "町田市" }),
      facility({ id: "best-1", vacancies: 1 }),
      facility({ id: "best-3", vacancies: 3 }),
    ];
    expect(rankFacilities(list, conditions()).map((x) => x.facility.id)).toEqual(["best-3", "best-1", "far", "out"]);
  });
});
