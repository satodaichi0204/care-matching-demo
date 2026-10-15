"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./domain";
import { supabase } from "./supabase";

export type Profile = {
  user_id: string;
  role: Role;
  display_name: string;
  facility_id: string | null;
};

type AuthState = {
  loading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string | undefined): Promise<Profile | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, role, display_name, facility_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

/** 役割ごとのマイページ */
export const HOME_BY_ROLE: Record<Role, string> = {
  applicant: "/applicant",
  facility: "/facility",
  admin: "/admin",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const p = await loadProfile(data.session?.user.id);
      if (active) {
        setProfile(p);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setProfile(null);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // コールバックの中で Supabase を待たない（デッドロックを避ける）
        setTimeout(() => loadProfile(session?.user.id).then((p) => active && setProfile(p)), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        error: error.message === "Invalid login credentials" ? "メールアドレスかパスワードが違います" : error.message,
        profile: null,
      };
    }
    const p = await loadProfile(data.user.id);
    setProfile(p);
    return { error: null, profile: p };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(() => ({ loading, profile, signIn, signOut }), [loading, profile, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider の内側で使ってください");
  return ctx;
}
