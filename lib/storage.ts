export interface Card {
  id: string;
  interval: number;
  easeFactor: number;
  dueDate: string;
  timesCorrect: number;
  timesWrong: number;
}

export interface Badge {
  id: string;
  earnedAt: string;
}

export interface DailyEntry {
  date: string;
  xp: number;
  sessionsCompleted: number;
}

export interface UserProgress {
  totalXP: number;
  streak: number;
  lastPracticeDate: string;
  longestStreak: number;
  cards: Record<string, Card>;
  completedSkills: string[];
  badges: Badge[];
  dailyHistory: DailyEntry[];
  notificationsEnabled: boolean;
  newCardsToday: number;
  newCardsDate: string;
}

const STORAGE_KEY = "suomi_progress";
const TRIP_DATE = "2026-07-25";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function loadProgress(): UserProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as UserProgress;
    return { ...defaultProgress(), ...parsed };
  } catch {
    return defaultProgress();
  }
}

function defaultProgress(): UserProgress {
  return {
    totalXP: 0,
    streak: 0,
    lastPracticeDate: "",
    longestStreak: 0,
    cards: {},
    completedSkills: [],
    badges: [],
    dailyHistory: [],
    notificationsEnabled: false,
    newCardsToday: 0,
    newCardsDate: today(),
  };
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function updateStreak(progress: UserProgress): UserProgress {
  const t = today();
  const last = progress.lastPracticeDate;
  if (last === t) return progress;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak: number;
  if (last === yesterdayStr) {
    newStreak = progress.streak + 1;
  } else if (last === "") {
    newStreak = 1;
  } else {
    newStreak = 1;
  }

  return {
    ...progress,
    streak: newStreak,
    lastPracticeDate: t,
    longestStreak: Math.max(progress.longestStreak, newStreak),
  };
}

export function addXP(progress: UserProgress, amount: number): UserProgress {
  const t = today();
  const dailyHistory = [...progress.dailyHistory];
  const todayEntry = dailyHistory.find((e) => e.date === t);
  if (todayEntry) {
    todayEntry.xp += amount;
  } else {
    dailyHistory.push({ date: t, xp: amount, sessionsCompleted: 0 });
  }
  return { ...progress, totalXP: progress.totalXP + amount, dailyHistory };
}

export function markSessionComplete(progress: UserProgress): UserProgress {
  const t = today();
  const dailyHistory = [...progress.dailyHistory];
  const todayEntry = dailyHistory.find((e) => e.date === t);
  if (todayEntry) {
    todayEntry.sessionsCompleted += 1;
  } else {
    dailyHistory.push({ date: t, xp: 0, sessionsCompleted: 1 });
  }
  return { ...progress, dailyHistory };
}

export function updateCard(progress: UserProgress, card: Card): UserProgress {
  return {
    ...progress,
    cards: { ...progress.cards, [card.id]: card },
  };
}

export function getCard(progress: UserProgress, cardId: string): Card {
  return (
    progress.cards[cardId] ?? {
      id: cardId,
      interval: 1,
      easeFactor: 2.5,
      dueDate: today(),
      timesCorrect: 0,
      timesWrong: 0,
    }
  );
}

export function applyAnswer(card: Card, correct: boolean): Card {
  const t = today();
  if (correct) {
    const newInterval = Math.min(Math.round(card.interval * card.easeFactor), 30);
    const due = new Date();
    due.setDate(due.getDate() + newInterval);
    return {
      ...card,
      interval: newInterval,
      easeFactor: Math.min(card.easeFactor + 0.1, 4.0),
      dueDate: due.toISOString().split("T")[0],
      timesCorrect: card.timesCorrect + 1,
    };
  } else {
    const due = new Date();
    due.setDate(due.getDate() + 1);
    return {
      ...card,
      interval: 1,
      easeFactor: Math.max(1.3, card.easeFactor - 0.2),
      dueDate: due.toISOString().split("T")[0],
      timesWrong: card.timesWrong + 1,
    };
  }
}

export function getDueCards(
  progress: UserProgress,
  skillId: string,
  allSeedIds: string[]
): { due: string[]; newCards: string[] } {
  const t = today();
  const due: string[] = [];
  const newCards: string[] = [];

  for (const seedId of allSeedIds) {
    const cardId = seedId;
    const card = progress.cards[cardId];
    if (!card) {
      newCards.push(cardId);
    } else if (card.dueDate <= t) {
      due.push(cardId);
    }
  }

  return { due, newCards };
}

export function getSkillAccuracy(progress: UserProgress, skillId: string, seedIds: string[]): number {
  let correct = 0;
  let total = 0;
  for (const id of seedIds) {
    const card = progress.cards[id];
    if (card) {
      correct += card.timesCorrect;
      total += card.timesCorrect + card.timesWrong;
    }
  }
  if (total === 0) return 0;
  return correct / total;
}

export function getSkillStars(accuracy: number, hasCards: boolean): 0 | 1 | 2 | 3 {
  if (!hasCards) return 0;
  if (accuracy >= 0.95) return 3;
  if (accuracy >= 0.8) return 2;
  return 1;
}

export function earnBadge(progress: UserProgress, badgeId: string): UserProgress {
  if (progress.badges.some((b) => b.id === badgeId)) return progress;
  return {
    ...progress,
    badges: [...progress.badges, { id: badgeId, earnedAt: new Date().toISOString() }],
  };
}

export function checkBadges(progress: UserProgress): UserProgress {
  let p = progress;
  const totalReviews = Object.values(p.cards).reduce(
    (sum, c) => sum + c.timesCorrect + c.timesWrong,
    0
  );

  if (p.badges.length === 0 && totalReviews > 0) {
    p = earnBadge(p, "first_lesson");
  }
  if (p.streak >= 7) p = earnBadge(p, "week_streak");
  if (p.completedSkills.includes("s2")) p = earnBadge(p, "cat_owner");
  if (totalReviews >= 100) p = earnBadge(p, "hundred_cards");

  // Partitive master: check s13 accuracy
  const s13Seeds = Array.from({ length: 30 }, (_, i) => `s13-${i}`);
  const s13Total = s13Seeds.reduce((sum, id) => {
    const c = p.cards[id];
    return sum + (c ? c.timesCorrect + c.timesWrong : 0);
  }, 0);
  const s13Correct = s13Seeds.reduce((sum, id) => {
    const c = p.cards[id];
    return sum + (c ? c.timesCorrect : 0);
  }, 0);
  if (s13Total >= 10 && s13Correct / s13Total >= 0.9) {
    p = earnBadge(p, "partitive_master");
  }

  return p;
}

export const BADGES: Record<string, { name: string; description: string; emoji: string }> = {
  first_lesson: { name: "Ensimmäinen päivä", description: "Completed your first lesson", emoji: "🌱" },
  week_streak: { name: "Viikon putki", description: "7 day streak!", emoji: "🔥" },
  cat_owner: { name: "Kissanomistaja", description: "Completed the About Me skill", emoji: "🐱" },
  partitive_master: { name: "Partitiivin mestari", description: "90%+ accuracy on 10 partitive exercises", emoji: "🏆" },
  hundred_cards: { name: "Sadan sanan klubi", description: "100 cards reviewed", emoji: "💯" },
  perfect_session: { name: "Täydellinen", description: "Perfect session — all correct!", emoji: "⭐" },
};

export function getTripDaysLeft(): number {
  const now = new Date();
  const trip = new Date(TRIP_DATE);
  const diff = trip.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getLast28Days(): { date: string; xp: number }[] {
  const result: { date: string; xp: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    result.push({ date: dateStr, xp: 0 });
  }
  return result;
}

export function hasSessionToday(progress: UserProgress): boolean {
  return progress.lastPracticeDate === today();
}
