import { describe, expect, it } from "vitest";
import { formatCareRange, formatFeeRange, formatManYen, formatRelative, formatUpdated } from "./format";

describe("formatManYen / formatFeeRange", () => {
  it("円を万円で表す", () => {
    expect(formatManYen(150_000)).toBe("15万円");
    expect(formatManYen(185_000)).toBe("18.5万円");
    expect(formatManYen(0)).toBe("0円");
  });

  it("月額の幅を表す", () => {
    expect(formatFeeRange(150_000, 225_000)).toBe("15万〜22.5万円");
    expect(formatFeeRange(120_000, 120_000)).toBe("12万円");
  });
});

describe("formatCareRange", () => {
  it("介護度の幅を表す", () => {
    expect(formatCareRange(5, 7)).toBe("要介護3〜要介護5");
    expect(formatCareRange(0, 5)).toBe("自立〜要介護3");
    expect(formatCareRange(3, 3)).toBe("要介護1");
  });
});

describe("formatRelative / formatUpdated", () => {
  const now = new Date("2026-10-15T12:00:00+09:00");
  const ago = (sec: number) => new Date(now.getTime() - sec * 1000);

  it("経過時間を日本語で返す", () => {
    expect(formatRelative(ago(10), now)).toBe("たった今");
    expect(formatRelative(ago(5 * 60), now)).toBe("5分前");
    expect(formatRelative(ago(3 * 3600), now)).toBe("3時間前");
    expect(formatRelative(ago(2 * 86400), now)).toBe("2日前");
  });

  it("「たった今更新」「N分前に更新」と自然な日本語にする", () => {
    expect(formatUpdated(ago(5), now)).toBe("たった今更新");
    expect(formatUpdated(ago(180), now)).toBe("3分前に更新");
  });
});
