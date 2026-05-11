"use client";

import { getLevelForXP, getXPProgress } from "@/lib/levels";
import { ProgressBar } from "./ProgressBar";

interface TopBarProps {
  xp: number;
  streak: number;
}

export function TopBar({ xp, streak }: TopBarProps) {
  const level = getLevelForXP(xp);
  const progress = getXPProgress(xp);

  return (
    <div className="flex items-center gap-3 px-4 py-3 safe-top">
      {/* Level badge */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-mint flex items-center justify-center flex-shrink-0">
          <span className="text-forest font-syne font-bold text-sm">{level.number}</span>
        </div>
        <span className="font-syne font-bold text-xs text-mint truncate hidden xs:block">
          {level.name}
        </span>
      </div>

      {/* Streak — center */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🔥</span>
          <span className="font-syne font-bold text-gold text-base">{streak}</span>
        </div>
      </div>

      {/* XP bar — right */}
      <div className="flex flex-col items-end gap-1 min-w-[80px]">
        <span className="font-dm text-xs text-cream/60">
          {progress.current}/{progress.needed} XP
        </span>
        <div className="w-20">
          <ProgressBar current={progress.current} total={progress.needed} color="bg-gold" />
        </div>
      </div>
    </div>
  );
}
