"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  loadProgress,
  saveProgress,
  updateCard,
  getCard,
  applyAnswer,
  addXP,
  updateStreak,
  markSessionComplete,
  earnBadge,
  checkBadges,
  UserProgress,
} from "@/lib/storage";
import { buildSession, assignExerciseType, SessionCard } from "@/lib/srs";
import { getSkill, SKILLS } from "@/lib/curriculum";
import { ExerciseType } from "@/lib/curriculum";
import { ProgressBar } from "@/components/ProgressBar";

interface ExerciseData {
  type: ExerciseType;
  prompt: string;
  hint?: string;
  options?: string[];
  answer: string;
  explanation: string;
}

type AnswerState = "unanswered" | "correct" | "wrong";

const XP_CORRECT = 10;
const XP_CORRECT_NO_HINT = 15;
const XP_SESSION_COMPLETE = 20;
const XP_PERFECT_SESSION = 50;

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?]/g, "");
}

function isAnswerClose(userAnswer: string, correct: string): boolean {
  const u = normalizeAnswer(userAnswer);
  const c = normalizeAnswer(correct);
  if (u === c) return true;
  // Allow 1-char difference for typos
  if (Math.abs(u.length - c.length) > 2) return false;
  let diffs = 0;
  const maxLen = Math.max(u.length, c.length);
  for (let i = 0; i < maxLen; i++) {
    if (u[i] !== c[i]) diffs++;
    if (diffs > 1) return false;
  }
  return true;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const rawSkillId = params.skillId as string;

  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [session, setSession] = useState<SessionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");
  const [userInput, setUserInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [animateCard, setAnimateCard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve "auto" to actual skill
  const skillId = rawSkillId === "auto" ? null : rawSkillId;

  const loadExercise = useCallback(
    async (card: SessionCard, p: UserProgress, index = 0, total = 0) => {
      setLoading(true);
      setError(null);
      setAnswerState("unanswered");
      setUserInput("");
      setSelectedOption(null);
      setShowHint(false);
      setHintUsed(false);
      setAnimateCard(false);

      const skill = getSkill(card.skillId);
      if (!skill) {
        setError("Skill not found");
        setLoading(false);
        return;
      }

      const exerciseType = assignExerciseType(card, index, Math.max(total, 8));

      try {
        const res = await fetch("/api/exercise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: card.skillId,
            cardSeed: card.seedTopic,
            grammarPoint: card.seedGrammar,
            exerciseType,
            isLeahSkill: skill.isLeahSkill,
          }),
        });

        if (!res.ok) throw new Error("API error");
        const data = (await res.json()) as ExerciseData;
        setExercise(data);
        setTimeout(() => setAnimateCard(true), 50);
        if (data.type === "production" || data.type === "fix_the_mistake" || data.type === "case_ending") {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      } catch {
        setError("Couldn't load exercise. Check your connection.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);

    let sess: SessionCard[];
    if (skillId) {
      sess = buildSession(p, skillId);
    } else {
      sess = buildSession(p);
    }

    if (sess.length === 0) {
      const firstSkill = SKILLS[0];
      sess = buildSession(p, firstSkill.id);
    }

    setSession(sess);
    setSessionTotal(sess.length);
    loadExercise(sess[0], p);
  }, [skillId, loadExercise]);

  function handleOptionSelect(option: string) {
    if (answerState !== "unanswered") return;
    setSelectedOption(option);

    if (!exercise) return;
    const correct = isAnswerClose(option, exercise.answer);
    handleResult(correct);
  }

  function handleTextSubmit() {
    if (!exercise || answerState !== "unanswered") return;
    const correct = isAnswerClose(userInput, exercise.answer);
    handleResult(correct);
  }

  function handleResult(correct: boolean) {
    if (!exercise || !progress) return;

    setAnswerState(correct ? "correct" : "wrong");

    const card = session[currentIndex];
    const existingCard = getCard(progress, card.cardId);
    const updatedCard = applyAnswer(existingCard, correct);

    const xpEarned = correct ? (hintUsed ? XP_CORRECT : XP_CORRECT_NO_HINT) : 0;

    let p = updateCard(progress, updatedCard);
    if (xpEarned > 0) {
      p = addXP(p, xpEarned);
    }
    p = updateStreak(p);
    p = checkBadges(p);
    saveProgress(p);
    setProgress(p);

    if (correct) setSessionCorrect((n) => n + 1);
    setSessionXP((n) => n + xpEarned);
  }

  function handleNext() {
    if (!progress) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= session.length) {
      // Session complete
      const perfect = sessionCorrect + (answerState === "correct" ? 1 : 0) === session.length;
      let p = progress;
      p = addXP(p, XP_SESSION_COMPLETE);
      if (perfect) {
        p = addXP(p, XP_PERFECT_SESSION);
        p = earnBadge(p, "perfect_session");
      }
      p = markSessionComplete(p);

      // Track new cards used today
      const newCardsUsed = session.filter((c) => c.isNew).length;
      const today = new Date().toISOString().split("T")[0];
      p = {
        ...p,
        newCardsToday: (p.newCardsDate === today ? p.newCardsToday : 0) + newCardsUsed,
        newCardsDate: today,
      };

      // Mark skill completed if all seeds seen
      if (skillId) {
        const skill = getSkill(skillId);
        if (skill && !p.completedSkills.includes(skillId)) {
          const allSeen = skill.seeds.every((s) => !!p.cards[s.id]);
          if (allSeen) {
            p = { ...p, completedSkills: [...p.completedSkills, skillId] };
          }
        }
      }

      p = checkBadges(p);
      saveProgress(p);
      setProgress(p);
      setShowComplete(true);
      return;
    }

    setCurrentIndex(nextIndex);
    loadExercise(session[nextIndex], progress, nextIndex, session.length);
  }

  if (showComplete && progress) {
    const totalCorrect = sessionCorrect + (answerState === "correct" ? 1 : 0);
    const perfect = totalCorrect === session.length;
    const totalXP = sessionXP + XP_SESSION_COMPLETE + (perfect ? XP_PERFECT_SESSION : 0);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 page-enter">
        <div className="text-5xl">{perfect ? "⭐" : "✅"}</div>
        <h1 className="font-syne font-bold text-2xl text-cream text-center">
          {perfect ? "Täydellinen!" : "Session complete!"}
        </h1>
        <div className="bg-surface rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4">
          <div className="flex justify-between">
            <span className="font-dm text-cream/60">Correct</span>
            <span className="font-syne font-bold text-mint">{totalCorrect}/{session.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-dm text-cream/60">XP earned</span>
            <span className="font-syne font-bold text-gold">+{totalXP} XP</span>
          </div>
          <div className="flex justify-between">
            <span className="font-dm text-cream/60">Streak</span>
            <span className="font-syne font-bold text-cream">🔥 {progress.streak}</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="w-full max-w-xs bg-mint text-forest font-syne font-bold py-4 rounded-2xl text-lg active:scale-95 transition-all"
        >
          Back home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
        <div className="font-dm text-cream/40 text-sm">Generating exercise...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
        <div className="text-3xl">⚠️</div>
        <div className="font-dm text-cream/70 text-center">{error}</div>
        <button
          onClick={() => exercise && loadExercise(session[currentIndex], progress!, currentIndex, session.length)}
          className="bg-mint text-forest font-syne font-bold px-6 py-3 rounded-xl"
        >
          Try again
        </button>
        <button onClick={() => router.push("/")} className="font-dm text-cream/50 text-sm">
          Back home
        </button>
      </div>
    );
  }

  if (!exercise) return null;

  const isInputType =
    exercise.type === "production" ||
    exercise.type === "fix_the_mistake" ||
    exercise.type === "case_ending";
  const isOptionType = !isInputType;

  return (
    <div className="flex flex-col min-h-screen px-4 pb-8 safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 py-3">
        <button
          onClick={() => router.push("/")}
          className="font-dm text-cream/50 text-sm active:text-cream"
        >
          ✕
        </button>
        <div className="flex-1">
          <ProgressBar current={currentIndex} total={session.length} />
        </div>
        <span className="font-dm text-cream/50 text-sm">
          {currentIndex + 1}/{session.length}
        </span>
      </div>

      {/* Skill label */}
      {skillId && (
        <div className="mb-4">
          <span className="font-syne font-bold text-xs text-mint/60 uppercase tracking-wide">
            {getSkill(skillId)?.finnishName ?? skillId}
          </span>
        </div>
      )}

      {/* Exercise card */}
      <div
        className={`flex-1 flex flex-col gap-6 transition-all duration-200 ${
          animateCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        } ${answerState === "wrong" ? "animate-shake" : ""}`}
      >
        {/* Exercise type label */}
        <div className="font-dm text-xs text-cream/40 uppercase tracking-widest">
          {exercise.type.replace(/_/g, " ")}
        </div>

        {/* Prompt */}
        <div className="bg-surface rounded-2xl p-5">
          <p className="font-dm text-cream text-lg leading-relaxed">{exercise.prompt}</p>
          {exercise.hint && !showHint && (
            <button
              onClick={() => {
                setShowHint(true);
                setHintUsed(true);
              }}
              className="mt-3 font-dm text-xs text-mint/60 underline"
            >
              Show hint
            </button>
          )}
          {showHint && exercise.hint && (
            <p className="mt-3 font-dm text-cream/50 text-sm italic">💡 {exercise.hint}</p>
          )}
        </div>

        {/* Options */}
        {isOptionType && exercise.options && (
          <div className="grid grid-cols-2 gap-3">
            {exercise.options.map((opt) => {
              let state = "default";
              if (answerState !== "unanswered") {
                if (isAnswerClose(opt, exercise.answer)) state = "correct";
                else if (opt === selectedOption) state = "wrong";
              } else if (opt === selectedOption) {
                state = "selected";
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleOptionSelect(opt)}
                  className={`
                    p-3 rounded-xl font-dm text-sm text-left transition-all active:scale-95
                    ${state === "default" ? "bg-surface text-cream" : ""}
                    ${state === "selected" ? "bg-surface border-2 border-mint text-cream" : ""}
                    ${state === "correct" ? "bg-mint/20 border-2 border-mint text-mint animate-flash" : ""}
                    ${state === "wrong" ? "bg-wrong/20 border-2 border-wrong text-wrong" : ""}
                  `}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Text input */}
        {isInputType && (
          <div className="flex flex-col gap-3">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (answerState === "unanswered") handleTextSubmit();
                  else handleNext();
                }
              }}
              disabled={answerState !== "unanswered"}
              placeholder="Type your answer..."
              className={`
                w-full bg-surface rounded-xl px-4 py-3 font-dm text-cream text-base
                border-2 outline-none transition-all
                ${answerState === "unanswered" ? "border-surface focus:border-mint" : ""}
                ${answerState === "correct" ? "border-mint animate-flash" : ""}
                ${answerState === "wrong" ? "border-wrong" : ""}
              `}
            />
            {answerState === "unanswered" && (
              <button
                onClick={handleTextSubmit}
                disabled={!userInput.trim()}
                className="bg-mint text-forest font-syne font-bold py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
              >
                Check
              </button>
            )}
          </div>
        )}

        {/* Feedback */}
        {answerState !== "unanswered" && (
          <div
            className={`
              rounded-2xl p-4 font-dm text-sm leading-relaxed animate-fade-in
              ${answerState === "correct" ? "bg-mint/15 text-cream" : "bg-wrong/15 text-cream"}
            `}
          >
            <div className="font-syne font-bold mb-2">
              {answerState === "correct" ? (
                <span className="text-mint">✓ Correct{!hintUsed ? " (+15 XP)" : " (+10 XP)"}</span>
              ) : (
                <span className="text-wrong">✗ Not quite — correct answer: <span className="font-bold">{exercise.answer}</span></span>
              )}
            </div>
            <p className="text-cream/80">{exercise.explanation}</p>
          </div>
        )}
      </div>

      {/* Continue button */}
      {answerState !== "unanswered" && (
        <div className="pt-4">
          <button
            onClick={handleNext}
            className="w-full bg-mint text-forest font-syne font-bold py-4 rounded-2xl text-lg active:scale-95 transition-all animate-fade-in"
          >
            {currentIndex + 1 >= session.length ? "Finish" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}
