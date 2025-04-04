import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

type ProgressData = {
  step: string;
  completed: string[];
};

export function useProgress() {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  const getProgress = useCallback(async (): Promise<ProgressData | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const parsedProgress: ProgressData = {
          step: data.current_step,
          completed: data.completed_steps || [],
        };
        setProgressData(parsedProgress);
        return parsedProgress;
      }

      return null;
    } catch (error) {
      console.error("Error fetching progress:", error);
      return null;
    }
  }, [user]);

  const saveProgress = useCallback(
    async (step: string, completed: string[]): Promise<void> => {
      if (!user?.id) return;

      try {
        const { data: existingProgress } = await supabase
          .from("onboarding_progress")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingProgress) {
          await supabase
            .from("onboarding_progress")
            .update({
              current_step: step,
              completed_steps: completed,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);
        } else {
          await supabase.from("onboarding_progress").insert({
            user_id: user.id,
            current_step: step,
            completed_steps: completed,
          });
        }

        setProgressData({ step, completed });
      } catch (error) {
        console.error("Error saving progress:", error);
      }
    },
    [user]
  );

  return {
    progressData,
    getProgress,
    saveProgress,
  };
}
