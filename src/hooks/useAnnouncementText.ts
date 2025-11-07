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
        const flags = data.flags as { announcement?: string };
        const raw = flags.announcement;
        const val = typeof raw === 'string' ? raw.trim() : undefined;
        setText(val || undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return text;
}
