import { useState, useEffect } from "react";
import { BINGO_BOARD_THIS_WEEK } from "./tiles";
import { BingoTile } from "./BingoTile";
import { FLAGS } from "@/env";
import { supabase } from "@/integrations/supabase/client";
import { getClaims, toggleClaim } from "./api";
import { computeScore } from "./lines";
import { StudentViewer } from "./StudentViewer";

export default function BingoBoard() {
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"me" | "student">("me");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [students, setStudents] = useState<string[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [claimedSlugs, setClaimedSlugs] = useState<Set<string>>(new Set());
  const [score, setScore] = useState({ lines: 0, blackout: false, claimed: 0 });
  const weekId = "week-2025-11-09"; // Derived from trip window
  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setViewingUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setViewingUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load student roster from config_filters.flags.student_logins
  useEffect(() => {
    if (!FLAGS.FEATURE_BINGO_CLAIMS) return;

    supabase
      .from("config_filters" as any)
      .select("flags")
      .eq("id", true)
      .single()
      .then(({ data }: any) => {
        const logins = data?.flags?.student_logins || [];
        setStudents(logins);
      });
  }, []);

  // Update viewingUserId based on view mode
  useEffect(() => {
    if (viewMode === "me") {
      setViewingUserId(user?.id ?? null);
    } else if (viewMode === "student" && selectedStudent) {
      // In student view, we need to look up the user_id for the selected login
      // For now, we'll use a stub - this requires a user_logins mapping table
      // Fallback: just show empty state for student view without proper mapping
      setViewingUserId(null);
    }
  }, [viewMode, selectedStudent, user]);

  // Load claims when viewer changes
  useEffect(() => {
    if (!FLAGS.FEATURE_BINGO_CLAIMS || !viewingUserId) {
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
    const success = await toggleClaim(user.id, weekId, tileSlug);
    if (!success) {
      // Rollback on error
      setClaimedSlugs(claimedSlugs);
    }
  };

  const isViewingOwnBoard = user && viewingUserId === user.id;
  const canToggle = FLAGS.FEATURE_BINGO_CLAIMS && isViewingOwnBoard;

  return (
    <div className="page">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Weekly Bingo</h1>
        {BINGO_BOARD_THIS_WEEK.weekHint && (
          <p className="text-sm text-muted-foreground">{BINGO_BOARD_THIS_WEEK.weekHint}</p>
        )}
        
        {FLAGS.FEATURE_BINGO_CLAIMS && user && (
          <>
            <StudentViewer
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedStudent={selectedStudent}
              onStudentChange={setSelectedStudent}
              students={students}
            />
            
            <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-border">
              <p className="text-sm font-medium">
                {viewMode === "student" && selectedStudent && (
                  <span className="text-muted-foreground mr-2">
                    Viewing: {selectedStudent} ·{" "}
                  </span>
                )}
                Lines: {score.lines}/12 · Blackout: {score.blackout ? "Yes" : "No"} · {score.claimed}/24 tiles
              </p>
            </div>
          </>
        )}

        {FLAGS.FEATURE_BINGO_CLAIMS && !user && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              Log in to track your board.
            </p>
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
