"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import DemoAccounts from "./DemoAccounts";
import { DemoNote, Field, inputClass } from "./ui";

export default function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error, profile } = await signIn(email, password);
    setPending(false);
    if (error || !profile) {
      setError(error ?? "アカウントの役割が見つかりません");
      return;
    }
    router.push(HOME_BY_ROLE[profile.role]);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 md:py-12">
      <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">ログイン</h1>
      <p className="mt-1 text-center text-sm text-slate-500">入居希望者、施設担当者、管理者の共通のログインです</p>

      <section className="mt-7">
        <h2 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] tracking-wider text-amber-800">DEMO</span>
          デモ用アカウントで試す（タップでログイン）
        </h2>
        <DemoAccounts layout="list" />
      </section>

      <div className="my-7 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        またはメールアドレスで
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="メールアドレス">
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="パスワード">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl bg-teal-600 font-semibold text-white shadow-sm shadow-teal-600/30 transition hover:bg-teal-700 disabled:opacity-60"
        >
          {pending ? "ログイン中…" : "ログイン"}
        </button>
      </form>
      <DemoNote className="mt-6 text-center" />
    </div>
  );
}
