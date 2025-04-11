import { supabase } from "@/lib/supabase";

export async function getOnboardingStatusByUserId(userId: string) {
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("current_step")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
