"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProgress, UserProgress, BADGES, getLast28Days } from "@/lib/storage";
import { getLevelForXP, getNextLevel, LEVELS } from "@/lib/levels";
import { SKILLS } from "@/lib/curriculum";

function HeatmapCalendar({ progress }: { progress: UserProgress }) {
  const days = getLast28Days();
  const historyMap = new Map(progress.dailyHistory.map((d) => [d.date, d]));

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const entry = historyMap.get(day.date);
        const hasActivity = entry && entry.sessionsCompleted > 0;
        const isToday = day.date === new Date().toISOString().split("T")[0];
        return (
          <div
            key={day.date}
            className={`
              w-full aspect-square rounded-md
              ${hasActivity ? "bg-mint" : "bg-surface"}
              ${isToday ? "ring-1 ring-cream/30" : ""}
            `}
            title={`${day.date}: ${entry?.xp ?? 0} XP`}
          />
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) return null;

  const level = getLevelForXP(progress.totalXP);
  const nextLevel = getNextLevel(progress.totalXP);

  const totalReviewed = Object.values(progress.cards).reduce(
    (sum, c) => sum + c.timesCorrect + c.timesWrong,
    0
  );
  const totalCorrect = Object.values(progress.cards).reduce((sum, c) => sum + c.timesCorrect, 0);
  const overallAccuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

  const bestXPDay = Math.max(...progress.dailyHistory.map((d) => d.xp), 0);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 pb-10 safe-top page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="font-dm text-cream/50 text-sm active:text-cream">
          ← Home
        </Link>
        <h1 className="font-syne font-bold text-cream text-xl flex-1 text-center">Stats</h1>
        <div className="w-12" />
      </div>

      {/* Level card */}
      <div className="bg-surface rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-mint flex items-center justify-center">
            <span className="font-syne font-bold text-forest text-xl">{level.number}</span>
          </div>
          <div>
            <div className="font-syne font-bold text-cream text-lg">{level.name}</div>
            <div className="font-dm text-cream/60 text-sm">{progress.totalXP.toLocaleString()} XP total</div>
          </div>
        </div>
        {nextLevel && (
          <div>
            <div className="flex justify-between font-dm text-xs text-cream/50 mb-1">
              <span>Next: {nextLevel.name}</span>
              <span>{nextLevel.minXP - progress.totalXP} XP to go</span>
            </div>
            <div className="w-full h-2 bg-forest rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all"
                style={{
                  width: `${Math.round(
                    ((progress.totalXP - level.minXP) / (nextLevel.minXP - level.minXP)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Streak", value: `${progress.streak}🔥`, sub: `best ${progress.longestStreak}` },
          { label: "Accuracy", value: `${overallAccuracy}%`, sub: `${totalReviewed} reviews` },
          { label: "Best Day", value: `${bestXPDay}`, sub: "XP in a day" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface rounded-xl p-3 text-center">
            <div className="font-syne font-bold text-cream text-lg">{stat.value}</div>
            <div className="font-dm text-cream/40 text-[10px] mt-0.5">{stat.sub}</div>
            <div className="font-dm text-cream/60 text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="font-syne font-bold text-cream text-sm mb-3">Last 28 Days</div>
        <HeatmapCalendar progress={progress} />
        <div className="flex items-center gap-2 mt-3">
          <div className="w-3 h-3 rounded-sm bg-surface ring-1 ring-cream/20" />
          <span className="font-dm text-xs text-cream/40">No practice</span>
          <div className="w-3 h-3 rounded-sm bg-mint ml-2" />
          <span className="font-dm text-xs text-cream/40">Practiced</span>
        </div>
      </div>

      {/* Skills overview */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="font-syne font-bold text-cream text-sm mb-3">Skills Overview</div>
        <div className="flex flex-col gap-2">
          {SKILLS.map((skill) => {
            const seedIds = skill.seeds.map((s) => s.id);
            const seen = seedIds.filter((id) => !!progress.cards[id]).length;
            const correct = seedIds.reduce((sum, id) => sum + (progress.cards[id]?.timesCorrect ?? 0), 0);
            const total = seedIds.reduce(
              (sum, id) =>
                sum + (progress.cards[id]?.timesCorrect ?? 0) + (progress.cards[id]?.timesWrong ?? 0),
              0
            );
            const acc = total > 0 ? Math.round((correct / total) * 100) : null;

            return (
              <div key={skill.id} className="flex items-center gap-3">
                <span
                  className={`font-dm text-xs w-2 ${skill.track === "A" ? "text-mint" : "text-gold"}`}
                >
                  {skill.track}
                </span>
                <span className="font-dm text-cream/70 text-xs flex-1 truncate">{skill.name}</span>
                <span className="font-dm text-cream/40 text-xs">{seen}/30</span>
                {acc !== null && (
                  <span
                    className={`font-dm text-xs w-10 text-right ${
                      acc >= 90 ? "text-mint" : acc >= 70 ? "text-gold" : "text-wrong"
                    }`}
                  >
                    {acc}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="font-syne font-bold text-cream text-sm mb-3">Badges</div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(BADGES).map(([id, info]) => {
            const earned = progress.badges.some((b) => b.id === id);
            return (
              <div
                key={id}
                className={`rounded-xl p-3 flex flex-col items-center gap-1 text-center ${
                  earned ? "bg-forest" : "bg-forest/50 opacity-40"
                }`}
              >
                <span className={`text-2xl ${!earned ? "grayscale" : ""}`}>{info.emoji}</span>
                <span className="font-syne font-bold text-xs text-cream leading-tight">{info.name}</span>
                <span className="font-dm text-cream/50 text-[10px] leading-tight">{info.description}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
