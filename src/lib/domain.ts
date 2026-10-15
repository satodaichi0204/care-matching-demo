// 業務で使うコードと表示名。データベースにはコードを保存し、画面ではここの表示名を使う。

export const FACILITY_TYPES = {
  tokuyo: { label: "特別養護老人ホーム", short: "特養" },
  roken: { label: "介護老人保健施設", short: "老健" },
  kaigo_yuryo: { label: "介護付き有料老人ホーム", short: "介護付き有料" },
  jutaku_yuryo: { label: "住宅型有料老人ホーム", short: "住宅型有料" },
  sakoju: { label: "サービス付き高齢者向け住宅", short: "サ高住" },
  group_home: { label: "グループホーム", short: "グループホーム" },
} as const;
export type FacilityType = keyof typeof FACILITY_TYPES;
export const FACILITY_TYPE_CODES = Object.keys(FACILITY_TYPES) as FacilityType[];

/** 介護度。添字がデータベースの値（0=自立 … 7=要介護5） */
export const CARE_LEVELS = [
  "自立",
  "要支援1",
  "要支援2",
  "要介護1",
  "要介護2",
  "要介護3",
  "要介護4",
  "要介護5",
] as const;
export const MAX_CARE_LEVEL = CARE_LEVELS.length - 1;

export const SERVICES = {
  dementia: "認知症ケア",
  end_of_life: "看取り",
  suction: "喀痰吸引",
  tube_feeding: "胃ろう・経管栄養",
  insulin: "インスリン注射",
  oxygen: "在宅酸素",
  dialysis: "透析の通院支援",
  night_nurse: "夜間の看護師常駐",
} as const;
export type ServiceCode = keyof typeof SERVICES;
export const SERVICE_CODES = Object.keys(SERVICES) as ServiceCode[];

export const MOVE_IN = {
  asap: "すぐにでも",
  within_3m: "3か月以内",
  undecided: "未定",
} as const;
export type MoveIn = keyof typeof MOVE_IN;

export const INQUIRY_STATUS = {
  new: { label: "新規", tone: "blue" },
  in_progress: { label: "対応中", tone: "amber" },
  visit: { label: "見学調整中", tone: "violet" },
  won: { label: "入居決定", tone: "green" },
  lost: { label: "見送り", tone: "slate" },
} as const;
export type InquiryStatus = keyof typeof INQUIRY_STATUS;
export const INQUIRY_STATUS_CODES = Object.keys(INQUIRY_STATUS) as InquiryStatus[];

/** デモで扱う地域（東京都内の8つの市区） */
export const CITIES = ["世田谷区", "杉並区", "練馬区", "大田区", "足立区", "江戸川区", "八王子市", "町田市"] as const;

export type Facility = {
  id: string;
  name: string;
  facility_type: FacilityType;
  city: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  monthly_fee_min: number;
  monthly_fee_max: number;
  admission_fee: number;
  care_level_min: number;
  care_level_max: number;
  accepts_welfare: boolean;
  services: ServiceCode[];
  capacity: number;
  vacancies: number;
  vacancy_updated_at: string;
  description: string;
  is_published: boolean;
};

/** 入居希望者の条件（マッチングに使う部分） */
export type Conditions = {
  care_level: number;
  preferred_cities: string[];
  budget_max: number;
  needs_welfare: boolean;
  required_services: ServiceCode[];
  preferred_types: FacilityType[];
};

export type Applicant = Conditions & {
  id: string;
  user_id: string | null;
  name: string;
  age: number | null;
  contact: string | null;
  move_in: MoveIn;
  note: string;
  updated_at: string;
};

export type Role = "applicant" | "facility" | "admin";
