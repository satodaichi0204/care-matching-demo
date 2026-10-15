import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import { AuthProvider } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ケアマッチ（デモ）",
    template: "%s｜ケアマッチ（デモ）",
  },
  description: "介護施設の空室情報と、入居希望者の条件をつなぐマッチングシステムのデモ版です。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex h-full flex-col bg-slate-50 font-sans text-slate-900">
        <AuthProvider>
          <SiteHeader />
          {!supabaseConfigured && (
            <p className="bg-red-600 px-4 py-2 text-sm text-white">
              Supabase の接続情報が設定されていません。.env.local（Vercel では環境変数）に NEXT_PUBLIC_SUPABASE_URL と
              NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。
            </p>
          )}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
