"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/domain";
import { Skeleton } from "./ui";

const LABEL: Record<Role, string> = { applicant: "入居希望者", facility: "施設担当者", admin: "管理者" };

/** 役割に合うときだけ中身を出す（データの保護はデータベースの RLS で行い、これは画面の案内のため） */
export default function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { loading, profile } = useAuth();
  if (loading)
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  if (profile?.role === role) return <>{children}</>;
  return (
    <div className="mx-auto w-full max-w-md p-6 text-center">
      <p className="text-sm text-slate-600">このページは{LABEL[role]}向けです。</p>
      <div className="mt-4 flex justify-center gap-2">
        {profile && (
          <Link
            href={HOME_BY_ROLE[profile.role]}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            自分のマイページへ
          </Link>
        )}
        <Link href="/login" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">
          {LABEL[role]}としてログイン
        </Link>
      </div>
    </div>
  );
}
