export interface Level {
  number: number;
  name: string;
  minXP: number;
}

export const LEVELS: Level[] = [
  { number: 1, name: "Aloittelija", minXP: 0 },
  { number: 2, name: "Opiskelija", minXP: 100 },
  { number: 3, name: "Harjoittelija", minXP: 250 },
  { number: 4, name: "Tuttu", minXP: 500 },
  { number: 5, name: "Taitava", minXP: 850 },
  { number: 6, name: "Sujuva", minXP: 1300 },
  { number: 7, name: "Vakuuttava", minXP: 1900 },
  { number: 8, name: "Ahkera", minXP: 2700 },
  { number: 9, name: "Innokas", minXP: 3700 },
  { number: 10, name: "Rohkea", minXP: 5000 },
  { number: 11, name: "Tarkka", minXP: 6600 },
  { number: 12, name: "Viisas", minXP: 8500 },
  { number: 13, name: "Kokenut", minXP: 10800 },
  { number: 14, name: "Lahjakas", minXP: 13500 },
  { number: 15, name: "Erinomainen", minXP: 16700 },
  { number: 16, name: "Mainio", minXP: 20500 },
  { number: 17, name: "Loistava", minXP: 25000 },
  { number: 18, name: "Upea", minXP: 30000 },
  { number: 19, name: "Legenda", minXP: 36000 },
  { number: 20, name: "Mestari", minXP: 43000 },
];

export function getLevelForXP(xp: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(xp: number): Level | null {
  const current = getLevelForXP(xp);
  return LEVELS.find((l) => l.number === current.number + 1) ?? null;
}

export function getXPProgress(xp: number): { current: number; needed: number; percent: number } {
  const current = getLevelForXP(xp);
  const next = getNextLevel(xp);
  if (!next) return { current: xp - current.minXP, needed: 1, percent: 100 };
  const current_in_level = xp - current.minXP;
  const needed = next.minXP - current.minXP;
  return { current: current_in_level, needed, percent: Math.round((current_in_level / needed) * 100) };
}
