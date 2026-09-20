const COMPASS_LABELS = [
  'Utara',
  'Timur Laut',
  'Timur',
  'Tenggara',
  'Selatan',
  'Barat Daya',
  'Barat',
  'Barat Laut',
];

const COMPASS_ABBREVIATIONS = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];

function normalize(bearing: number) {
  if (!Number.isFinite(bearing)) return 0;

  return ((bearing % 360) + 360) % 360;
}

/** Human direction for a compass bearing, e.g. 45 -> "Timur Laut". */
export function compassLabel(bearing: number) {
  return COMPASS_LABELS[Math.round(normalize(bearing) / 45) % 8];
}

/** Short direction for tight spaces, e.g. 45 -> "TL". */
export function compassAbbreviation(bearing: number) {
  return COMPASS_ABBREVIATIONS[Math.round(normalize(bearing) / 45) % 8];
}

export function compassDegrees(bearing: number) {
  return Math.round(normalize(bearing));
}
