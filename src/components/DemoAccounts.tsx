"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_ACCOUNTS } from "@/config";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import { ChevronRightIcon, HomeIcon, ShieldIcon, UserIcon } from "./ui";

const ICON = { applicant: UserIcon, facility: HomeIcon, admin: ShieldIcon } as const;
const TONE = {
  applicant: "bg-teal-50 text-teal-700",
  facility: "bg-sky-50 text-sky-700",
  admin: "bg-violet-50 text-violet-700",
} as const;

/** デモ用アカウントを押すと、そのままログインして各役割のページへ進む */
export default function DemoAccounts({ layout = "grid" }: { layout?: "grid" | "list" }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (email: string, password: string) => {
    setPending(email);
    setError(null);
    const { error, profile } = await signIn(email, password);
    if (error || !profile) {
      setPending(null);
      setError(error ?? "アカウントの役割が見つかりません");
      return;
    }
    router.push(HOME_BY_ROLE[profile.role]);
  };

  return (
    <div>
      <ul className={layout === "grid" ? "grid gap-3 md:grid-cols-3" : "space-y-2"}>
        {DEMO_ACCOUNTS.map((a) => {
          const Icon = ICON[a.role];
          return (
            <li key={a.email}>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => go(a.email, a.password)}
                className="group flex h-full w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md disabled:opacity-60"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[a.role]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-slate-900">{a.title}として試す</span>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-teal-600" />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{a.summary}</span>
                  <span className="mt-2 block truncate text-[11px] text-slate-400">
                    {pending === a.email ? "ログイン中…" : `${a.displayName}・${a.email}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
