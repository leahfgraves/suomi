import { SKILLS, ExerciseType } from "./curriculum";
import { UserProgress, getDueCards, getCard } from "./storage";

const MAX_NEW_CARDS_PER_DAY = 5;
const SESSION_SIZE = 8;

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export interface SessionCard {
  cardId: string;
  skillId: string;
  seedTopic: string;
  seedGrammar: string;
  isNew: boolean;
  preferredType?: ExerciseType;
}

export function buildSession(progress: UserProgress, targetSkillId?: string): SessionCard[] {
  const t = today();
  const allDue: SessionCard[] = [];
  const allNew: SessionCard[] = [];

  const newCardsUsedToday =
    progress.newCardsDate === t ? progress.newCardsToday : 0;
  let newCardsRemaining = MAX_NEW_CARDS_PER_DAY - newCardsUsedToday;

  const skillsToCheck = targetSkillId
    ? SKILLS.filter((s) => s.id === targetSkillId)
    : SKILLS;

  for (const skill of skillsToCheck) {
    const { due, newCards } = getDueCards(progress, skill.id, skill.seeds.map((s) => s.id));

    for (const cardId of due) {
      const seed = skill.seeds.find((s) => s.id === cardId);
      if (!seed) continue;
      allDue.push({
        cardId,
        skillId: skill.id,
        seedTopic: seed.topic,
        seedGrammar: seed.grammarPoint,
        isNew: false,
        preferredType: seed.preferredType,
      });
    }

    for (const cardId of newCards) {
      const seed = skill.seeds.find((s) => s.id === cardId);
      if (!seed) continue;
      allNew.push({
        cardId,
        skillId: skill.id,
        seedTopic: seed.topic,
        seedGrammar: seed.grammarPoint,
        isNew: true,
        preferredType: seed.preferredType,
      });
    }
  }

  // Pick cards: due first, then new (limited)
  const selected: SessionCard[] = [];
  const shuffledDue = shuffle(allDue);
  const shuffledNew = shuffle(allNew);

  selected.push(...shuffledDue.slice(0, SESSION_SIZE));

  if (selected.length < SESSION_SIZE && newCardsRemaining > 0) {
    const toAdd = Math.min(
      SESSION_SIZE - selected.length,
      newCardsRemaining,
      shuffledNew.length
    );
    selected.push(...shuffledNew.slice(0, toAdd));
  }

  // Order: recognition first, production last
  return orderSession(selected.slice(0, SESSION_SIZE));
}

function orderSession(cards: SessionCard[]): SessionCard[] {
  if (cards.length === 0) return cards;

  const recognitionTypes: ExerciseType[] = ["recognition", "conversation", "family_vocab"];
  const productionTypes: ExerciseType[] = ["production"];

  const first = cards.find((c) =>
    c.preferredType && recognitionTypes.includes(c.preferredType)
  ) ?? cards[0];

  const last = [...cards].reverse().find((c) =>
    c.preferredType && productionTypes.includes(c.preferredType)
  ) ?? cards[cards.length - 1];

  const middle = cards.filter((c) => c !== first && c !== last);

  if (first === last) return cards;
  return [first, ...shuffle(middle), last];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function countDueCards(progress: UserProgress): number {
  let count = 0;
  for (const skill of SKILLS) {
    const { due } = getDueCards(progress, skill.id, skill.seeds.map((s) => s.id));
    count += due.length;
  }
  return count;
}

export function assignExerciseType(
  card: SessionCard,
  position: number,
  total: number
): ExerciseType {
  if (card.preferredType) return card.preferredType;

  // Position-based defaults
  if (position === 0) return "recognition";
  if (position === total - 1) return "production";

  // Skill-specific default
  const skill = SKILLS.find((s) => s.id === card.skillId);
  if (skill?.id === "s4") return "family_vocab";

  const mid: ExerciseType[] = [
    "recognition",
    "production",
    "case_ending",
    "fix_the_mistake",
    "odd_one_out",
    "conversation",
  ];
  return mid[Math.floor(Math.random() * mid.length)];
}
