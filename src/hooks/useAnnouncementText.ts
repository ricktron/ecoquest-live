import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function useAnnouncementText() {
  const [text, setText] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("config_filters")
        .select("flags")
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error && data?.flags) {
        const flags = data.flags as Record<string, any>;
        const announcement = ((flags?.announcement ?? '').toString().trim()) || undefined;
        setText(announcement);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return text;
}
