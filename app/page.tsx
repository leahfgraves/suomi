"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { TripCountdown } from "@/components/TripCountdown";
import { SkillTree } from "@/components/SkillTree";
import { ProgressBar } from "@/components/ProgressBar";
import { loadProgress, saveProgress, UserProgress, BADGES, hasSessionToday } from "@/lib/storage";
import { getUnlockedSkills } from "@/lib/curriculum";
import { countDueCards } from "@/lib/srs";
import { getLevelForXP } from "@/lib/levels";

const DAILY_GOAL_SESSIONS = 1;

export default function HomePage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setDueCount(countDueCards(p));

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          const updated = { ...p, notificationsEnabled: true };
          saveProgress(updated);
          setProgress(updated);
        }
      });
    }

    // Schedule 8pm reminder if no session today
    if ("serviceWorker" in navigator && !hasSessionToday(p)) {
      navigator.serviceWorker.ready.then((reg) => {
        // Push notification scheduling handled by SW
        if (reg.active) {
          reg.active.postMessage({ type: "schedule_reminder" });
        }
      });
    }
  }, []);

  if (!progress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cream/40 font-dm">Loading...</div>
      </div>
    );
  }

  const unlockedSkills = getUnlockedSkills(progress.completedSkills);
  const unlockedIds = unlockedSkills.map((s) => s.id);
  const sessionsDoneToday = progress.dailyHistory.find(
    (d) => d.date === new Date().toISOString().split("T")[0]
  )?.sessionsCompleted ?? 0;
  const recentBadges = [...progress.badges].reverse().slice(0, 4);

  return (
    <div className="flex flex-col gap-4 pb-8 page-enter">
      <TopBar xp={progress.totalXP} streak={progress.streak} />

      <TripCountdown />

      {/* Practice Now button */}
      <div className="px-4">
        <Link href="/lesson/auto">
          <button className="w-full bg-mint text-forest font-syne font-bold text-lg py-4 rounded-2xl transition-all active:scale-95">
            {dueCount > 0
              ? `Practice Now · ${dueCount} card${dueCount === 1 ? "" : "s"} due`
              : "Practice Now · Review session"}
          </button>
        </Link>
      </div>

      {/* Daily goal */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-syne font-bold text-xs text-cream/60 uppercase tracking-wide">
            Daily Goal
          </span>
          <span className="font-dm text-xs text-cream/60">
            {sessionsDoneToday}/{DAILY_GOAL_SESSIONS} session{DAILY_GOAL_SESSIONS !== 1 ? "s" : ""}
          </span>
        </div>
        <ProgressBar
          current={Math.min(sessionsDoneToday, DAILY_GOAL_SESSIONS)}
          total={DAILY_GOAL_SESSIONS}
        />
      </div>

      {/* Skill tree */}
      <div>
        <div className="px-4 mb-3 flex items-center justify-between">
          <span className="font-syne font-bold text-cream/70 text-sm uppercase tracking-wide">
            Skills
          </span>
          <Link href="/stats" className="font-dm text-mint text-sm">
            Stats →
          </Link>
        </div>
        <SkillTree progress={progress} unlockedSkillIds={unlockedIds} />
      </div>

      {/* Recent badges */}
      {recentBadges.length > 0 && (
        <div className="px-4">
          <div className="font-syne font-bold text-cream/70 text-sm uppercase tracking-wide mb-3">
            Badges
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentBadges.map((badge) => {
              const info = BADGES[badge.id];
              if (!info) return null;
              return (
                <div
                  key={badge.id}
                  className="flex-shrink-0 bg-surface rounded-xl p-3 flex flex-col items-center gap-1 w-20"
                >
                  <span className="text-2xl">{info.emoji}</span>
                  <span className="font-dm text-[10px] text-cream/70 text-center leading-tight">
                    {info.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
