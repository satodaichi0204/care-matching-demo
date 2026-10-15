// デモの設定

/** 地図の初期表示（東京都の中心あたり） */
export const DEFAULT_CENTER = { lat: 35.68, lng: 139.62 };
export const DEFAULT_ZOOM = 9.6;

/** APIキー不要の無料の地図（OpenFreeMap） */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const DEMO_FACILITY_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_APPLICANT_ID = "00000000-0000-4000-9000-000000000001";

/** デモ用アカウント（トップとログイン画面に表示する。scripts/db-setup.mts でも使う） */
export const DEMO_ACCOUNTS = [
  {
    role: "applicant",
    email: "applicant@demo.example.com",
    password: "demo-applicant-2026",
    displayName: "佐藤 ハル（ご家族が登録）",
    title: "入居希望者",
    summary: "条件を登録して、合う施設を探し、相談を申し込む",
    applicantId: DEMO_APPLICANT_ID,
  },
  {
    role: "facility",
    email: "facility@demo.example.com",
    password: "demo-facility-2026",
    displayName: "ひだまりの里 世田谷 担当者",
    title: "施設担当者",
    summary: "空室と施設情報を更新し、届いた相談に対応する",
    facilityId: DEMO_FACILITY_ID,
  },
  {
    role: "admin",
    email: "admin@demo.example.com",
    password: "demo-admin-2026",
    displayName: "運営管理者",
    title: "管理者",
    summary: "全施設、入居希望者、相談の状況を一覧で管理する",
  },
] as const;
