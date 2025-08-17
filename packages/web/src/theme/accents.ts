export const GROUP_ACCENTS = [
  '#2DE9C8',
  '#00AFF7',
  '#947BFF',
  '#F8279C',
  '#FF6F4C',
  '#FFE13D',
] as const;
export type GroupAccent = (typeof GROUP_ACCENTS)[number];

export const groupAccentByIndex = (i: number): GroupAccent =>
  GROUP_ACCENTS[((i % GROUP_ACCENTS.length) + GROUP_ACCENTS.length) % GROUP_ACCENTS.length];
