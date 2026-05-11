"use client";

import Link from "next/link";
import { SKILLS, Skill } from "@/lib/curriculum";
import { UserProgress, getSkillAccuracy, getSkillStars } from "@/lib/storage";
import { Stars } from "./Stars";

interface SkillTreeProps {
  progress: UserProgress;
  unlockedSkillIds: string[];
}

interface SkillNodeProps {
  skill: Skill;
  unlocked: boolean;
  stars: 0 | 1 | 2 | 3;
  hasCards: boolean;
}

function SkillNode({ skill, unlocked, stars, hasCards }: SkillNodeProps) {
  const content = (
    <div
      className={`
        rounded-xl p-3 text-center transition-all
        ${unlocked ? "bg-surface" : "bg-surface/40 opacity-50"}
        ${unlocked && hasCards ? "border border-mint/30" : ""}
      `}
    >
      <div className={`font-syne font-bold text-xs mb-1 ${unlocked ? "text-cream" : "text-cream/40"}`}>
        {skill.finnishName}
      </div>
      <div className={`font-dm text-[10px] leading-tight ${unlocked ? "text-cream/60" : "text-cream/30"}`}>
        {skill.name}
      </div>
      {hasCards && (
        <div className="mt-1.5 flex justify-center">
          <Stars count={stars} size="sm" />
        </div>
      )}
      {!unlocked && (
        <div className="mt-1 text-cream/30 text-xs">🔒</div>
      )}
    </div>
  );

  if (!unlocked) return content;
  return <Link href={`/lesson/${skill.id}`}>{content}</Link>;
}

export function SkillTree({ progress, unlockedSkillIds }: SkillTreeProps) {
  const trackA = SKILLS.filter((s) => s.track === "A").sort((a, b) => a.order - b.order);
  const trackB = SKILLS.filter((s) => s.track === "B").sort((a, b) => a.order - b.order);

  function getStars(skill: Skill): 0 | 1 | 2 | 3 {
    const seedIds = skill.seeds.map((s) => s.id);
    const accuracy = getSkillAccuracy(progress, skill.id, seedIds);
    const hasCards = seedIds.some((id) => !!progress.cards[id]);
    return getSkillStars(accuracy, hasCards);
  }

  function hasCards(skill: Skill): boolean {
    return skill.seeds.some((s) => !!progress.cards[s.id]);
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex gap-3">
        {/* Track A */}
        <div className="flex-1">
          <div className="font-syne font-bold text-xs text-mint/70 mb-2 text-center">PRACTICAL</div>
          <div className="flex flex-col gap-2">
            {trackA.map((skill) => (
              <SkillNode
                key={skill.id}
                skill={skill}
                unlocked={unlockedSkillIds.includes(skill.id)}
                stars={getStars(skill)}
                hasCards={hasCards(skill)}
              />
            ))}
          </div>
        </div>

        {/* SVG connector lines — decorative */}
        <div className="w-4 flex items-center">
          <svg width="16" height="100%" viewBox="0 0 16 600" preserveAspectRatio="none" className="opacity-20">
            <line x1="8" y1="0" x2="8" y2="600" stroke="#4ecb8d" strokeWidth="1" strokeDasharray="4,4" />
          </svg>
        </div>

        {/* Track B */}
        <div className="flex-1">
          <div className="font-syne font-bold text-xs text-gold/70 mb-2 text-center">GRAMMAR</div>
          <div className="flex flex-col gap-2">
            {trackB.map((skill) => (
              <SkillNode
                key={skill.id}
                skill={skill}
                unlocked={unlockedSkillIds.includes(skill.id)}
                stars={getStars(skill)}
                hasCards={hasCards(skill)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
