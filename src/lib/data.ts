// 画面から使うデータの読み込み（読み取りの権限は、データベースの RLS で制限している）
import type { Applicant, Facility } from "./domain";
import { supabase } from "./supabase";

export async function fetchFacilities(): Promise<Facility[]> {
  const { data, error } = await supabase.from("facilities").select("*").order("name");
  if (error) throw error;
  return (data as Facility[]) ?? [];
}

export async function fetchFacility(id: string): Promise<Facility | null> {
  const { data, error } = await supabase.from("facilities").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Facility | null;
}

/** ログイン中の入居希望者の情報（入居希望者でなければ null） */
export async function fetchMyApplicant(): Promise<Applicant | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("applicants").select("*").eq("user_id", auth.user.id).maybeSingle();
  return (data as Applicant | null) ?? null;
}
