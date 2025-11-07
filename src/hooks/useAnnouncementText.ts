import { useEffect, useState } from "react";
import { fetchAnnouncement } from "@/lib/api";

export default function useAnnouncementText() {
  const [text, setText] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const val = await fetchAnnouncement();
      if (!cancelled) {
        setText(val);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return text;
}
