export const LINEUP_SLOTS = [
  "Passing",
  "Rushing",
  "Receiving",
  "Defense",
  "Kicking",
] as const;

export type LineupSlot = (typeof LINEUP_SLOTS)[number];

export const isLineupSlot = (value: unknown): value is LineupSlot =>
  typeof value === "string" && LINEUP_SLOTS.includes(value as LineupSlot);

export const normalizeLineupSlot = (value: unknown): LineupSlot | undefined =>
  isLineupSlot(value) ? value : undefined;
