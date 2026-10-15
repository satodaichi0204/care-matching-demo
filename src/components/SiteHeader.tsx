"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import { LogoutIcon } from "./ui";

const ROLE_LABEL = { applicant: "入居希望者", facility: "施設担当者", admin: "管理者" } as const;

export default function SiteHeader() {
  return (
    <header className="z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white shadow-sm shadow-teal-600/30">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
              <path d="M12 21.2c-.3 0-.6-.1-.8-.3C7 17.4 3 14 3 9.6 3 6.9 5.1 4.8 7.7 4.8c1.7 0 3.2.9 4.3 2.3 1.1-1.4 2.6-2.3 4.3-2.3 2.6 0 4.7 2.1 4.7 4.8 0 4.4-4 7.8-8.2 11.3-.2.2-.5.3-.8.3Z" />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">ケアマッチ</span>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800">
            DEMO
          </span>
        </Link>
        <Suspense fallback={<Nav pathname="" />}>
          <ActiveNav />
        </Suspense>
      </div>
    </header>
  );
}

function ActiveNav() {
  return <Nav pathname={usePathname()} />;
}

function Nav({ pathname }: { pathname: string }) {
  const { profile, loading, signOut } = useAuth();
  const router = useRouter();
  const link = (href: string, label: string, active: boolean, className = "") => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
        active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      } ${className}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center gap-1 text-sm">
      {link("/search", "施設を探す", pathname.startsWith("/search") || pathname.startsWith("/facilities"))}
      {!loading && profile && (
        <>
          {link(HOME_BY_ROLE[profile.role], "マイページ", pathname === HOME_BY_ROLE[profile.role])}
          <span className="hidden rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 md:inline">
            {ROLE_LABEL[profile.role]}：{profile.display_name}
          </span>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            aria-label="ログアウト"
            title="ログアウト"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </>
      )}
      {!loading && !profile && link("/login", "ログイン", pathname.startsWith("/login"))}
    </nav>
  );
}
