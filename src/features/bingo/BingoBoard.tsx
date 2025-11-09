import { useState, useEffect } from "react";
import { BINGO_BOARD_THIS_WEEK } from "./tiles";
import { BingoTile } from "./BingoTile";
import { FLAGS } from "@/env";
import { supabase } from "@/integrations/supabase/client";
import { getClaims, toggleClaim } from "./api";
import { computeScore } from "./lines";
import { StudentViewer } from "./StudentViewer";

export default function BingoBoard() {
  const CLAIMS_ON = import.meta.env.VITE_FEATURE_BINGO_CLAIMS === "1";
  const weekId = "week-2025-11-09"; // Derived from trip window
  
  // Parse URL param for preselected user
  const params = new URLSearchParams(window.location.search);
  const urlUser = params.get("u");
  
  const [user, setUser] = useState<any>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(urlUser);
  const [claimedSlugs, setClaimedSlugs] = useState<Set<string>>(new Set());
  const [score, setScore] = useState({ lines: 0, blackout: false, claimed: 0 });

  // Debug logging
  console.debug("BINGO flags:", { CLAIMS_ON, weekId, meId: user?.id ?? null });

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      // Only auto-set viewing user if no URL param was provided
      if (!urlUser) {
        setViewingUserId(userId);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      // Only auto-set viewing user if no URL param was provided
      if (!urlUser) {
        setViewingUserId(userId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync URL when viewingUserId changes
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (viewingUserId && viewingUserId !== user?.id) {
      sp.set("u", viewingUserId);
    } else {
      sp.delete("u");
    }
    history.replaceState(null, "", `${location.pathname}?${sp.toString()}`);
  }, [viewingUserId, user]);

  // Load claims when viewer changes
  useEffect(() => {
    if (!CLAIMS_ON || !viewingUserId) {
      setClaimedSlugs(new Set());
      return;
    }

    getClaims(viewingUserId, weekId).then(slugs => {
      const slugSet = new Set(slugs);
      setClaimedSlugs(slugSet);
      
      // Compute score
      const claimedPositions = new Set(
        tiles
          .filter(t => slugSet.has(t.slug))
          .map(t => t.position)
      );
      setScore(computeScore(claimedPositions));
    });
  }, [viewingUserId, weekId]);

  // Ensure the FREE tile is at grid center (position 12).
  const tiles = [...BINGO_BOARD_THIS_WEEK.tiles].sort((a, b) => a.position - b.position);

  // Guard: if misconfigured, show error and don't render grid
  if (tiles.length !== 25 || tiles[12]?.slug !== "free") {
    return (
      <div className="page">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md max-w-md mx-auto mt-8">
          <p className="font-semibold">Bingo misconfigured</p>
          <p className="text-sm mt-1">
            Expected 25 tiles with FREE at position 12, got {tiles.length} tiles.
          </p>
        </div>
      </div>
    );
  }

  // Handle tile toggle
  const handleTileToggle = async (tileSlug: string) => {
    if (!user || !viewingUserId || viewingUserId !== user.id) return;
    
    // Optimistic update
    const newClaimed = new Set(claimedSlugs);
    if (newClaimed.has(tileSlug)) {
      newClaimed.delete(tileSlug);
    } else {
      newClaimed.add(tileSlug);
    }
    setClaimedSlugs(newClaimed);
    
    // Update score
    const claimedPositions = new Set(
      tiles
        .filter(t => newClaimed.has(t.slug))
        .map(t => t.position)
    );
    setScore(computeScore(claimedPositions));
    
    // Persist to DB
    const result = await toggleClaim(user.id, weekId, tileSlug);
    if (!result.ok) {
      // Rollback on error
      setClaimedSlugs(claimedSlugs);
    }
  };

  const isViewingOwnBoard = user && viewingUserId === user.id;
  const canToggle = CLAIMS_ON && isViewingOwnBoard;

  return (
    <div className="page pb-[calc(72px+env(safe-area-inset-bottom))] min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Weekly Bingo</h1>
        {BINGO_BOARD_THIS_WEEK.weekHint && (
          <p className="text-sm text-muted-foreground">{BINGO_BOARD_THIS_WEEK.weekHint}</p>
        )}
        
        {CLAIMS_ON && (
          <div className="mt-4 mb-2">
            <div className="mb-1 text-xs text-muted-foreground">Viewer</div>
            <StudentViewer
              weekId={weekId}
              meUserId={user?.id ?? null}
              value={viewingUserId}
              onChange={setViewingUserId}
            />
            
            {viewingUserId && (
              <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-border">
                <p className="text-sm font-medium">
                  Lines: {score.lines}/12 · Blackout: {score.blackout ? "Yes" : "No"} · {score.claimed}/24 tiles
                </p>
              </div>
            )}
            
            {!user && !viewingUserId && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  Log in to track your own board, or select a student above.
                </p>
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2 hidden sm:block">
          Tap an emoji for "What counts / Examples / Photo tip".
        </p>
      </header>

      <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 max-w-full px-0 sm:px-3 sm:max-w-3xl mx-auto">
        {tiles.map((t) => (
          <BingoTile 
            key={t.slug + "-" + t.position} 
            tile={t}
            isDone={claimedSlugs.has(t.slug) || t.slug === "free"}
            onToggle={canToggle && t.slug !== "free" ? () => handleTileToggle(t.slug) : undefined}
            readOnly={!canToggle}
          />
        ))}
      </div>
    </div>
  );
}
