// supabase/seed.sql を生成する。`npm run db:seed:generate`
// 施設名、住所、電話番号、入居希望者の氏名と連絡先は、すべて架空のもの。
import { writeFileSync } from "node:fs";
import { CITIES, type Conditions, type FacilityType, type MoveIn, type ServiceCode } from "../src/lib/domain.ts";
import { rankFacilities } from "../src/lib/matching.ts";

const facilityId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const applicantId = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;

// 毎回同じデータになるよう、決まった種から乱数を作る
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261015);
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// 市区の中心あたりの座標（施設の位置はこの周りにずらす）
const CITY_CENTER: Record<string, [number, number]> = {
  世田谷区: [35.6464, 139.6532],
  杉並区: [35.6995, 139.6364],
  練馬区: [35.7356, 139.6517],
  大田区: [35.5613, 139.716],
  足立区: [35.775, 139.8044],
  江戸川区: [35.7067, 139.8683],
  八王子市: [35.6664, 139.316],
  町田市: [35.5486, 139.4467],
};

const NAMES = [
  "ひだまりの里",
  "さくら苑",
  "あおぞらの家",
  "やすらぎ荘",
  "みどりの丘",
  "こもれび",
  "なごみ苑",
  "ゆうあいホーム",
  "つばさの郷",
  "はなみずき",
  "せせらぎ",
  "ほほえみの家",
  "かがやき",
  "いこいの森",
  "ふれあい苑",
  "あさひの杜",
  "わかば",
  "しらかば",
  "こころの家",
  "まどか",
  "すみれ",
  "あおば",
  "けやきの郷",
  "ぬくもり",
];

// 市区ごとに3施設。種類の組み合わせを市区ごとに変える
const TYPES_BY_CITY: FacilityType[][] = [
  ["kaigo_yuryo", "group_home", "tokuyo"], // 世田谷区（1番目がデモの施設担当者の施設）
  ["jutaku_yuryo", "kaigo_yuryo", "sakoju"], // 杉並区
  ["tokuyo", "sakoju", "group_home"], // 練馬区
  ["roken", "kaigo_yuryo", "jutaku_yuryo"], // 大田区
  ["tokuyo", "jutaku_yuryo", "sakoju"], // 足立区
  ["group_home", "roken", "jutaku_yuryo"], // 江戸川区
  ["tokuyo", "kaigo_yuryo", "sakoju"], // 八王子市
  ["roken", "group_home", "kaigo_yuryo"], // 町田市
];

const DESCRIPTIONS: Record<FacilityType, string> = {
  tokuyo: "常に介護が必要な方のための公的な施設です。費用を抑えて長く暮らせます。",
  roken: "病院から在宅へ戻るまでの間、リハビリと医療ケアを受けながら過ごす施設です。",
  kaigo_yuryo: "24時間の介護スタッフと看護体制があり、介護度が上がっても住み続けられます。",
  jutaku_yuryo: "生活支援が中心の住まいです。介護は外部の介護サービスと組み合わせて受けます。",
  sakoju: "安否確認と生活相談が付いた賃貸住宅です。自立した生活を続けたい方に向いています。",
  group_home: "認知症の方が少人数で共同生活を送る住まいです。家庭的な環境でケアを受けられます。",
};

type Seed = {
  id: string;
  name: string;
  type: FacilityType;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  feeMin: number;
  feeMax: number;
  admission: number;
  careMin: number;
  careMax: number;
  welfare: boolean;
  services: ServiceCode[];
  capacity: number;
  vacancies: number;
  updatedMinutesAgo: number;
};

const svc = (entries: [ServiceCode, number][]) => entries.filter(([, p]) => chance(p)).map(([s]) => s);

function makeFacility(n: number, type: FacilityType, city: string): Seed {
  const [lat, lng] = CITY_CENTER[city];
  const base = {
    id: facilityId(n),
    name: `${NAMES[n - 1]} ${city.replace(/[区市]$/, "")}`,
    type,
    city,
    lat: Number((lat + (rand() - 0.5) * 0.04).toFixed(5)),
    lng: Number((lng + (rand() - 0.5) * 0.05).toFixed(5)),
    phone: `03-0000-${String(1000 + n).slice(-4)}`,
    updatedMinutesAgo: chance(0.5) ? between(10, 300) : between(300, 60 * 24 * 10),
  };
  switch (type) {
    case "tokuyo": {
      const feeMin = roundTo(between(80, 110) * 1000, 5000);
      const capacity = between(6, 10) * 10;
      return {
        ...base,
        feeMin,
        feeMax: feeMin + roundTo(between(30, 50) * 1000, 5000),
        admission: 0,
        careMin: 5,
        careMax: 7,
        welfare: chance(0.85),
        services: [
          "dementia",
          "end_of_life",
          ...svc([
            ["tube_feeding", 0.6],
            ["suction", 0.6],
          ]),
        ],
        capacity,
        vacancies: between(0, 2),
      };
    }
    case "roken": {
      const feeMin = roundTo(between(90, 120) * 1000, 5000);
      return {
        ...base,
        feeMin,
        feeMax: feeMin + roundTo(between(30, 50) * 1000, 5000),
        admission: 0,
        careMin: 3,
        careMax: 7,
        welfare: true,
        services: ["dementia", "suction", "insulin", "oxygen", "night_nurse", ...svc([["tube_feeding", 0.5]])],
        capacity: between(8, 10) * 10,
        vacancies: between(0, 5),
      };
    }
    case "kaigo_yuryo": {
      const feeMin = roundTo(between(175, 280) * 1000, 5000);
      return {
        ...base,
        feeMin,
        feeMax: feeMin + roundTo(between(50, 100) * 1000, 5000),
        admission: chance(0.5) ? 0 : between(1, 5) * 1_000_000,
        careMin: chance(0.6) ? 1 : 3,
        careMax: 7,
        welfare: chance(0.2),
        services: [
          "dementia",
          ...svc([
            ["end_of_life", 0.7],
            ["insulin", 0.6],
            ["oxygen", 0.5],
            ["night_nurse", 0.5],
            ["suction", 0.4],
          ]),
        ],
        capacity: between(3, 7) * 10,
        vacancies: between(0, 6),
      };
    }
    case "jutaku_yuryo": {
      const feeMin = roundTo(between(130, 190) * 1000, 5000);
      return {
        ...base,
        feeMin,
        feeMax: feeMin + roundTo(between(30, 60) * 1000, 5000),
        admission: roundTo(between(0, 30) * 10_000, 50_000),
        careMin: 0,
        careMax: 7,
        welfare: chance(0.5),
        services: svc([
          ["dementia", 0.7],
          ["insulin", 0.4],
          ["oxygen", 0.4],
          ["dialysis", 0.5],
        ]),
        capacity: between(3, 6) * 10,
        vacancies: between(0, 8),
      };
    }
    case "sakoju": {
      const feeMin = roundTo(between(120, 170) * 1000, 5000);
      return {
        ...base,
        feeMin,
        feeMax: feeMin + roundTo(between(30, 60) * 1000, 5000),
        admission: roundTo(between(15, 40) * 10_000, 50_000),
        careMin: 0,
        careMax: 5,
        welfare: chance(0.5),
        services: svc([
          ["oxygen", 0.4],
          ["dialysis", 0.4],
          ["insulin", 0.3],
        ]),
        capacity: between(3, 6) * 10,
        vacancies: between(1, 10),
      };
    }
    case "group_home": {
      const feeMin = roundTo(between(130, 165) * 1000, 5000);
      return {
        ...base,
        feeMin,
        feeMax: feeMin + roundTo(between(10, 30) * 1000, 5000),
        admission: roundTo(between(0, 20) * 10_000, 50_000),
        careMin: 2,
        careMax: 7,
        welfare: chance(0.5),
        services: ["dementia", ...svc([["end_of_life", 0.4]])],
        capacity: chance(0.5) ? 9 : 18,
        vacancies: between(0, 2),
      };
    }
  }
}

const facilities: Seed[] = [];
CITIES.forEach((city, ci) => {
  TYPES_BY_CITY[ci].forEach((type) => facilities.push(makeFacility(facilities.length + 1, type, city)));
});

// デモの施設担当者の施設は、見せ方が安定するよう値を固定する
Object.assign(facilities[0], {
  feeMin: 180_000,
  feeMax: 260_000,
  admission: 0,
  careMin: 1,
  careMax: 7,
  welfare: false,
  services: ["dementia", "end_of_life", "suction", "insulin", "night_nurse"],
  capacity: 50,
  vacancies: 3,
  updatedMinutesAgo: 95,
} satisfies Partial<Seed>);

// ---------------------------------------------------------------------------
// 入居希望者
// ---------------------------------------------------------------------------
type ApplicantSeed = Conditions & {
  id: string;
  name: string;
  age: number;
  contact: string;
  moveIn: MoveIn;
  note: string;
};

const SURNAMES = ["高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤", "吉田", "山田", "佐々木", "松本"];
const GIVEN = ["トミ", "清", "キヨ", "茂", "フミ", "博", "和子", "勇", "幸子", "正", "節子", "昭"];

const applicants: ApplicantSeed[] = [
  {
    id: applicantId(1),
    name: "佐藤 ハル",
    age: 84,
    contact: "（デモ）090-0000-0001",
    care_level: 5,
    preferred_cities: ["世田谷区", "杉並区"],
    budget_max: 200_000,
    needs_welfare: false,
    required_services: ["dementia"],
    preferred_types: [],
    moveIn: "within_3m",
    note: "物忘れが進み、日中の一人暮らしが難しくなってきました。家族が週末に面会しやすい場所を希望します。",
  },
  {
    id: applicantId(2),
    name: "鈴木 一郎",
    age: 78,
    contact: "（デモ）090-0000-0002",
    care_level: 4,
    preferred_cities: ["足立区", "江戸川区"],
    budget_max: 140_000,
    needs_welfare: true,
    required_services: [],
    preferred_types: [],
    moveIn: "asap",
    note: "生活保護を受けています。担当のケースワーカーと相談しながら探しています。",
  },
];

// 相談が届いている3人は、デモの施設（世田谷）に合う条件にしておく
const toDemoFacility: Partial<Conditions>[] = [
  { care_level: 6, preferred_cities: ["世田谷区"], budget_max: 250_000, required_services: ["end_of_life"] },
  { care_level: 3, preferred_cities: ["世田谷区", "大田区"], budget_max: 220_000, required_services: ["insulin"] },
  { care_level: 5, preferred_cities: ["世田谷区"], budget_max: 230_000, required_services: ["dementia", "suction"] },
];

for (let i = 0; i < 12; i++) {
  const n = i + 3;
  const preset = toDemoFacility[i] ?? {};
  const allServices: ServiceCode[] = [
    "dementia",
    "end_of_life",
    "suction",
    "tube_feeding",
    "insulin",
    "oxygen",
    "dialysis",
    "night_nurse",
  ];
  const services = Array.from(new Set(Array.from({ length: between(0, 2) }, () => pick(allServices))));
  const cities = Array.from(new Set(Array.from({ length: between(1, 2) }, () => pick(CITIES))));
  applicants.push({
    id: applicantId(n),
    name: `${SURNAMES[i]} ${GIVEN[i]}`,
    age: between(70, 95),
    contact: `（デモ）090-0000-${String(n).padStart(4, "0")}`,
    care_level: between(0, 7),
    preferred_cities: cities,
    budget_max: between(10, 30) * 10_000,
    needs_welfare: chance(0.2),
    required_services: services,
    preferred_types: chance(0.3) ? [pick(["tokuyo", "kaigo_yuryo", "group_home", "sakoju"] as FacilityType[])] : [],
    moveIn: pick(["asap", "within_3m", "undecided"] as MoveIn[]),
    note: "",
    ...preset,
  });
}

// ---------------------------------------------------------------------------
// 相談
// ---------------------------------------------------------------------------
const asFacility = (f: Seed) => ({
  id: f.id,
  facility_type: f.type,
  city: f.city,
  monthly_fee_min: f.feeMin,
  monthly_fee_max: f.feeMax,
  care_level_min: f.careMin,
  care_level_max: f.careMax,
  accepts_welfare: f.welfare,
  services: f.services,
  vacancies: f.vacancies,
});
const bestFor = (a: ApplicantSeed, exclude: string[]) =>
  rankFacilities(facilities.map(asFacility), a).find((r) => r.match.eligible && !exclude.includes(r.facility.id));

type InquirySeed = { applicant: number; facility: string; status: string; message: string; hoursAgo: number };
const inquiries: InquirySeed[] = [
  {
    applicant: 3,
    facility: facilities[0].id,
    status: "new",
    message: "父の看取りまでお願いできる施設を探しています。空室の状況を教えてください。",
    hoursAgo: 3,
  },
  {
    applicant: 4,
    facility: facilities[0].id,
    status: "in_progress",
    message: "インスリン注射が必要です。夜間の対応について伺えますか。",
    hoursAgo: 30,
  },
  {
    applicant: 5,
    facility: facilities[0].id,
    status: "visit",
    message: "来週末に家族で見学したいです。",
    hoursAgo: 72,
  },
];
const demoBest = bestFor(applicants[0], [facilities[0].id]);
if (demoBest) {
  inquiries.push({
    applicant: 1,
    facility: demoBest.facility.id,
    status: "in_progress",
    message: "母の入居について相談させてください。週末の面会は可能でしょうか。",
    hoursAgo: 20,
  });
}
for (const [n, status] of [
  [6, "won"],
  [7, "lost"],
  [8, "new"],
  [2, "in_progress"],
] as const) {
  const best = bestFor(applicants[n - 1], []);
  if (best)
    inquiries.push({
      applicant: n,
      facility: best.facility.id,
      status,
      message: "入居について相談したいです。",
      hoursAgo: between(5, 200),
    });
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);
const arr = (xs: readonly string[]) =>
  xs.length ? `array[${xs.map((x) => q(x)).join(", ")}]::text[]` : "'{}'::text[]";

const facilityRows = facilities.map(
  (f) =>
    `  (${q(f.id)}, ${q(f.name)}, ${q(f.type)}, ${q(f.city)}, ${q(`東京都${f.city}（架空の住所）`)}, ${f.lat}, ${f.lng}, ${q(f.phone)}, ${f.feeMin}, ${f.feeMax}, ${f.admission}, ${f.careMin}, ${f.careMax}, ${f.welfare}, ${arr(f.services)}, ${f.capacity}, ${f.vacancies}, now() - interval '${f.updatedMinutesAgo} minutes', ${q(DESCRIPTIONS[f.type])}, true)`,
);

const applicantRows = applicants.map(
  (a) =>
    `  (${q(a.id)}, ${q(a.name)}, ${a.age}, ${q(a.contact)}, ${a.care_level}, ${arr(a.preferred_cities)}, ${a.budget_max}, ${a.needs_welfare}, ${arr(a.required_services)}, ${arr(a.preferred_types)}, ${q(a.moveIn)}, ${q(a.note)}, now() - interval '${between(1, 240)} hours')`,
);

const inquiryRows = inquiries.map(
  (i) =>
    `  (${q(applicantId(i.applicant))}, ${q(i.facility)}, ${q(i.message)}, ${q(i.status)}, now() - interval '${i.hoursAgo} hours', now() - interval '${Math.max(1, Math.floor(i.hoursAgo / 2))} hours')`,
);

const sql = `-- デモ用データ。scripts/generate-seed.mts で生成（手で編集しない）
-- 何度実行しても、施設、入居希望者、相談を初期状態に戻せる（ログイン用のアカウントは残る）。
begin;

delete from public.inquiries;
-- ログイン用アカウントとのつながり（user_id）は、scripts/db-setup.mts が付け直す
delete from public.applicants;

insert into public.facilities (id, name, facility_type, city, address, lat, lng, phone, monthly_fee_min, monthly_fee_max, admission_fee, care_level_min, care_level_max, accepts_welfare, services, capacity, vacancies, vacancy_updated_at, description, is_published) values
${facilityRows.join(",\n")}
on conflict (id) do update set
  name = excluded.name, facility_type = excluded.facility_type, city = excluded.city, address = excluded.address,
  lat = excluded.lat, lng = excluded.lng, phone = excluded.phone,
  monthly_fee_min = excluded.monthly_fee_min, monthly_fee_max = excluded.monthly_fee_max, admission_fee = excluded.admission_fee,
  care_level_min = excluded.care_level_min, care_level_max = excluded.care_level_max, accepts_welfare = excluded.accepts_welfare,
  services = excluded.services, capacity = excluded.capacity, vacancies = excluded.vacancies,
  description = excluded.description, is_published = excluded.is_published;
-- 上の更新で変わった更新日時を、デモ用の値に戻す
update public.facilities f set vacancy_updated_at = s.at from (values
${facilities.map((f) => `  (${q(f.id)}::uuid, now() - interval '${f.updatedMinutesAgo} minutes')`).join(",\n")}
) as s(id, at) where f.id = s.id;
-- 管理画面で追加された施設は消す
delete from public.facilities where id not in (${facilities.map((f) => q(f.id)).join(", ")});

insert into public.applicants (id, name, age, contact, care_level, preferred_cities, budget_max, needs_welfare, required_services, preferred_types, move_in, note, updated_at) values
${applicantRows.join(",\n")};

insert into public.inquiries (applicant_id, facility_id, message, status, created_at, updated_at) values
${inquiryRows.join(",\n")};

commit;
`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);

const demoMatches = rankFacilities(facilities.map(asFacility), applicants[0]).filter((r) => r.match.eligible);
console.log(
  `supabase/seed.sql を生成しました（施設 ${facilities.length}、入居希望者 ${applicants.length}、相談 ${inquiries.length}）`,
);
console.log(
  `デモの入居希望者に合う施設：${demoMatches.length}件（${demoMatches.map((r) => `${r.match.score}点`).join("、")}）`,
);
