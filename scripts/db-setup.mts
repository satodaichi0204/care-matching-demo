// Supabase にスキーマとデモ用データを入れ、デモ用のアカウント（入居希望者、施設担当者、管理者）を用意する。
//   npm run db:setup   … 初回（スキーマ + デモ用データ + アカウント）
//   npm run db:reset   … デモ用データを初期状態に戻す（アカウントは残し、つなぎ直す）
// 必要な環境変数（.env.local）：SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS } from "../src/config.ts";

const seedOnly = process.argv.includes("--seed-only");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`環境変数 ${name} がありません。.env.local を確認してください（.env.example を参照）`);
    process.exit(1);
  }
  return value;
}

const db = new pg.Client({ connectionString: requireEnv("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
await db.connect();

try {
  if (!seedOnly) {
    const { rows } = await db.query("select to_regclass('public.facilities') is not null as exists");
    if (rows[0].exists) {
      console.log("スキーマは作成済みのため、マイグレーションを飛ばします");
    } else {
      const dir = new URL("../supabase/migrations/", import.meta.url);
      for (const file of readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort()) {
        console.log(`マイグレーションを適用: ${file}`);
        await db.query(readFileSync(new URL(file, dir), "utf8"));
      }
    }
  }

  console.log("デモ用データを投入: supabase/seed.sql");
  await db.query(readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"));

  const admin = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const account of DEMO_ACCOUNTS) {
    const { rows } = await db.query("select id from auth.users where email = $1", [account.email]);
    let userId: string | undefined = rows[0]?.id;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
      console.log(`アカウントを作成: ${account.email}`);
    }
    await db.query(
      `insert into public.profiles (user_id, role, display_name, facility_id) values ($1, $2, $3, $4)
       on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name, facility_id = excluded.facility_id`,
      [userId, account.role, account.displayName, "facilityId" in account ? account.facilityId : null],
    );
    if ("applicantId" in account) {
      await db.query("update public.applicants set user_id = $1 where id = $2", [userId, account.applicantId]);
    }
  }
  console.log("完了しました");
} finally {
  await db.end();
}
