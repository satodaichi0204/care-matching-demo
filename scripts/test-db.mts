// データベース（マイグレーション、シード、RLS、業務の関数）のテスト。`npm run test:db`
// PGlite（WebAssembly 版 PostgreSQL）に、Supabase の auth スキーマとロールをまねた環境を作って検証する。
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("..", import.meta.url);
const migration = readdirSync(new URL("supabase/migrations/", root))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(new URL(`supabase/migrations/${f}`, root), "utf8"))
  .join("\n");
const seed = readFileSync(new URL("supabase/seed.sql", root), "utf8");

const pg = new PGlite();
let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};
const expectError = async (sql: string, pattern: RegExp, msg: string) => {
  try {
    await pg.exec(sql);
    ok(false, `${msg}（エラーにならなかった）`);
  } catch (e) {
    const message = (e as Error).message;
    ok(pattern.test(message), `${msg} → ${message}`);
  }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const one = async (sql: string, params?: unknown[]): Promise<any> => (await pg.query(sql, params)).rows[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const all = async (sql: string, params?: unknown[]): Promise<any[]> => (await pg.query(sql, params)).rows;

// --- Supabase の環境を最低限まねる ---
await pg.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Supabase は public に作ったものへ、既定で anon / authenticated の全権限を与える
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`);

await pg.exec(migration);
ok(true, "マイグレーションを適用できた");
await pg.exec(seed);
ok(true, "シードを投入できた");
ok((await one("select count(*)::int n from facilities")).n === 24, "施設が24件");
ok((await one("select count(*)::int n from applicants")).n === 14, "入居希望者が14件");
ok((await one("select count(*)::int n from inquiries")).n === 8, "相談が8件");

// --- アカウント（db-setup.mts と同じつなぎ方） ---
const FACILITY = "00000000-0000-4000-8000-000000000001";
const OTHER_FACILITY = "00000000-0000-4000-8000-000000000002";
const APPLICANT = "00000000-0000-4000-9000-000000000001";
const OTHER_APPLICANT = "00000000-0000-4000-9000-000000000002";
const uApplicant = (await one("insert into auth.users (email) values ('a@x') returning id")).id;
const uFacility = (await one("insert into auth.users (email) values ('f@x') returning id")).id;
const uAdmin = (await one("insert into auth.users (email) values ('m@x') returning id")).id;
await pg.query(
  "insert into profiles values ($1, 'applicant', '希望者', null), ($2, 'facility', '施設', $3), ($4, 'admin', '管理者', null)",
  [uApplicant, uFacility, FACILITY, uAdmin],
);
await pg.query("update applicants set user_id = $1 where id = $2", [uApplicant, APPLICANT]);

const as = (role: "anon" | "authenticated", uid = "") =>
  pg.exec(`reset role; set role ${role}; set request.jwt.claim.sub = '${uid}';`);
const asAdminDb = () => pg.exec(`reset role; set request.jwt.claim.sub = '';`);

// --- ログインなしの利用者 ---
await as("anon");
ok((await one("select count(*)::int n from facilities")).n === 24, "ログインなしでも掲載中の施設を読める");
await expectError("select count(*) from applicants", /permission denied/, "ログインなしでは入居希望者の表を読めない");
await expectError("select count(*) from inquiries", /permission denied/, "ログインなしでは相談の表を読めない");
await expectError(`update facilities set vacancies = 0`, /permission denied/, "ログインなしでは施設を更新できない");
await expectError(
  `select * from anonymous_applicants()`,
  /permission denied/,
  "ログインなしでは匿名の条件一覧も呼べない",
);

// --- 入居希望者 ---
await as("authenticated", uApplicant);
ok(
  (await all("select id from applicants")).map((r) => r.id).join() === APPLICANT,
  "入居希望者は自分の情報だけが見える",
);
await pg.query("update applicants set budget_max = 210000 where id = $1", [APPLICANT]);
ok(
  (await one("select budget_max from applicants where id = $1", [APPLICANT])).budget_max === 210000,
  "自分の条件を更新できる",
);
await pg.query("update applicants set budget_max = 1 where id = $1", [OTHER_APPLICANT]);
await asAdminDb();
ok(
  (await one("select budget_max from applicants where id = $1", [OTHER_APPLICANT])).budget_max !== 1,
  "他人の条件は更新されない",
);
await as("authenticated", uApplicant);
const myInquiries = await all("select * from inquiries");
ok(myInquiries.length === 1 && myInquiries[0].applicant_id === APPLICANT, "自分の相談だけが見える");
await pg.query("insert into inquiries (applicant_id, facility_id, message) values ($1, $2, 'デモ')", [
  APPLICANT,
  FACILITY,
]);
ok(true, "施設に相談を申し込める");
await expectError(
  `insert into inquiries (applicant_id, facility_id, message) values ('${OTHER_APPLICANT}', '${OTHER_FACILITY}', 'なりすまし')`,
  /row-level security/,
  "他人になりすまして相談できない",
);
await expectError(
  `insert into inquiries (applicant_id, facility_id, message) values ('${APPLICANT}', '${FACILITY}', '二重')`,
  /duplicate key|unique/,
  "同じ施設に二重に相談できない",
);
await expectError(
  `select * from anonymous_applicants()`,
  /施設担当者と管理者だけ/,
  "入居希望者は他人の条件一覧を見られない",
);
await expectError(`select adjust_vacancy('${FACILITY}', 1)`, /権限がありません/, "入居希望者は空室を変えられない");
const anyInquiry = myInquiries[0].id;
await expectError(
  `select set_inquiry_status('${anyInquiry}', 'won')`,
  /権限がありません/,
  "入居希望者は相談の状況を変えられない",
);

// --- 施設担当者 ---
await as("authenticated", uFacility);
ok(
  (await one("select count(*)::int n from applicants")).n === 0,
  "施設担当者は入居希望者の表を直接読めない（氏名と連絡先は見えない）",
);
const anon = await all("select * from anonymous_applicants()");
ok(anon.length === 14 && !("name" in anon[0]) && !("contact" in anon[0]), "匿名の条件一覧には氏名と連絡先が含まれない");
ok(
  anon.every((r) => /^No\.[0-9A-F]{6}$/.test(r.code)),
  `匿名の番号で表す（例：${anon[0].code}、${anon[0].age_group}）`,
);
const received = await all("select * from received_inquiries()");
ok(
  received.length === 4 && received.every((r) => r.facility_id === FACILITY),
  "届いた相談は自分の施設の4件だけ（新しく届いた1件を含む）",
);
ok(
  received.some((r) => r.applicant_name === "佐藤 ハル"),
  "相談してきた入居希望者の氏名と連絡先は、その施設にだけ開示される",
);
const before = (await one("select vacancies from facilities where id = $1", [FACILITY])).vacancies;
const after = (await one(`select vacancies from adjust_vacancy('${FACILITY}', 1)`)).vacancies;
ok(after === before + 1, `空室を ${before} → ${after} に更新できる`);
await expectError(`select adjust_vacancy('${FACILITY}', -100)`, /空室数は0から定員/, "空室を0未満にはできない");
await expectError(`select adjust_vacancy('${OTHER_FACILITY}', 1)`, /権限がありません/, "他の施設の空室は変えられない");
await pg.query("update facilities set monthly_fee_min = 185000 where id = $1", [FACILITY]);
ok(
  (await one("select monthly_fee_min from facilities where id = $1", [FACILITY])).monthly_fee_min === 185000,
  "自分の施設の情報を編集できる",
);
await pg.query("update facilities set monthly_fee_min = 1 where id = $1", [OTHER_FACILITY]);
await asAdminDb();
ok(
  (await one("select monthly_fee_min from facilities where id = $1", [OTHER_FACILITY])).monthly_fee_min !== 1,
  "他の施設の情報は編集されない",
);
await as("authenticated", uFacility);
await expectError(
  `update facilities set is_published = false where id = '${FACILITY}'`,
  /管理者だけ/,
  "掲載の停止は施設担当者にはできない",
);
const inquiryId = received[0].id;
ok(
  (await one(`select status from set_inquiry_status('${inquiryId}', 'visit')`)).status === "visit",
  "届いた相談の状況を更新できる",
);
await asAdminDb();
const otherInquiry = (await one("select id from inquiries where facility_id <> $1 limit 1", [FACILITY])).id;
await as("authenticated", uFacility);
await expectError(
  `select set_inquiry_status('${otherInquiry}', 'won')`,
  /権限がありません/,
  "他の施設の相談は更新できない",
);
await expectError(
  `select set_inquiry_status('${inquiryId}', 'unknown')`,
  /check constraint/,
  "決められた状況以外にはできない",
);

// --- 管理者 ---
await as("authenticated", uAdmin);
ok((await one("select count(*)::int n from applicants")).n === 14, "管理者は全員の入居希望者を見られる");
ok((await all("select * from received_inquiries()")).length === 9, "管理者はすべての相談を見られる");
await pg.query("update facilities set is_published = false where id = $1", [OTHER_FACILITY]);
ok(true, "管理者は掲載を停止できる");
await as("anon");
ok(
  (await one("select count(*)::int n from facilities")).n === 23,
  "掲載を停止した施設は、ログインなしでは見えなくなる",
);
await as("authenticated", uAdmin);
await pg.query(
  "insert into facilities (name, facility_type, city, address, lat, lng, monthly_fee_min, monthly_fee_max, care_level_min, care_level_max, capacity) values ('新規施設', 'sakoju', '町田市', '架空', 35.5, 139.4, 100000, 120000, 0, 5, 30)",
);
ok(true, "管理者は施設を追加できる");
await as("authenticated", uFacility);
await expectError(
  "insert into facilities (name, facility_type, city, address, lat, lng, monthly_fee_min, monthly_fee_max, care_level_min, care_level_max, capacity) values ('勝手な施設', 'sakoju', '町田市', '架空', 35.5, 139.4, 100000, 120000, 0, 5, 30)",
  /row-level security/,
  "施設担当者は施設を追加できない",
);

// --- 空室の更新日時 ---
await asAdminDb();
const t1 = (await one("select vacancy_updated_at from facilities where id = $1", [FACILITY])).vacancy_updated_at;
await pg.query("update facilities set description = '説明を変更' where id = $1", [FACILITY]);
const t2 = (await one("select vacancy_updated_at from facilities where id = $1", [FACILITY])).vacancy_updated_at;
ok(String(t1) === String(t2), "空室以外の変更では、空室の更新日時は変わらない");

// --- シードは何度でも流せる ---
await pg.exec(seed);
ok((await one("select count(*)::int n from facilities")).n === 24, "シードの再実行で、追加した施設が消えて24件に戻る");
ok((await one("select count(*)::int n from inquiries")).n === 8, "シードの再実行で、相談が初期状態に戻る");
ok(
  (await one("select is_published from facilities where id = $1", [OTHER_FACILITY])).is_published === true,
  "シードの再実行で、掲載も元に戻る",
);
ok((await one("select count(*)::int n from profiles")).n === 3, "シードの再実行でもアカウントの役割は残る");

console.log(failures === 0 ? "\nすべて成功" : `\n失敗 ${failures} 件`);
process.exit(failures ? 1 : 0);
