import type { ReactNode } from "react";

// One hand-drawn symbol per temple in data/temples.json, each inspired by the temple's real
// landmark feature (see docs/MAP.md). Every symbol lives in a 64 x 64 box with the ground at
// y = 58, shares one line weight and one palette, and is 3-8 paths. tests/illustrated-map.test.ts
// checks the registry matches the seed ids exactly.

const INK = "#4a3222";
const BRICK = "#c8764a";
const BRICK_DARK = "#a85a34";
const GOLD = "#f0a030";
const GOLD_LIGHT = "#f7c25c";
const WHITE = "#fffdf8";
const TEAK = "#6a4529";
const TEAK_DARK = "#3d2717";
const SILVER = "#dde3ea";
const SILVER_DARK = "#a3afbf";
const GREEN = "#8fb27a";
const GREEN_DARK = "#5f8a4f";
const WATER = "#bfd6e4";
const STUCCO = "#e8d3ad";
const GREY = "#b8b0a6";

export type TempleSymbol = { description: string; draw: () => ReactNode };

export const TEMPLE_SYMBOLS: Record<string, TempleSymbol> = {
  wat_chedi_luang: {
    description: "massive stepped brick chedi with a central stairway, a ruined rounded top and two grey elephant niches",
    draw: () => (
      <>
        <rect x="10" y="50" width="44" height="8" rx="1.5" fill={BRICK} />
        <rect x="14" y="43" width="36" height="8" rx="1.5" fill={BRICK_DARK} />
        <path d="M18,43 L22,22 H42 L46,43 Z" fill={BRICK} />
        <path d="M22,22 Q32,10 42,22 Z" fill={BRICK_DARK} />
        <rect x="29" y="26" width="6" height="24" fill={STUCCO} stroke="none" />
        <circle cx="22" cy="40" r="2.4" fill={GREY} />
        <circle cx="42" cy="40" r="2.4" fill={GREY} />
      </>
    ),
  },
  wat_phra_singh: {
    description: "golden Lanna bell chedi beside a white viharn with a two-tier teak roof and gold finial",
    draw: () => (
      <>
        <rect x="36" y="46" width="20" height="12" rx="1.5" fill={WHITE} />
        <path d="M38,46 C38,34 42,28 46,20 C50,28 54,34 54,46 Z" fill={GOLD} />
        <path d="M46,8 L49,21 H43 Z" fill={GOLD_LIGHT} />
        <rect x="6" y="42" width="28" height="16" rx="1.5" fill={WHITE} />
        <path d="M4,42 L20,26 L36,42 Z" fill={TEAK} />
        <path d="M11,33 L20,20 L29,33 Z" fill={TEAK_DARK} />
        <path d="M20,20 V14" stroke={GOLD} strokeWidth="2" />
      </>
    ),
  },
  wat_chiang_man: {
    description: "gold bell chedi raised on a square base ringed by grey elephant fronts",
    draw: () => (
      <>
        <rect x="10" y="46" width="44" height="12" rx="1.5" fill={WHITE} />
        <path d="M12,52 a5,5 0 0 1 10,0 Z M22,52 a5,5 0 0 1 10,0 Z M32,52 a5,5 0 0 1 10,0 Z M42,52 a5,5 0 0 1 10,0 Z" fill={GREY} />
        <path d="M17,52 v5 M47,52 v5" />
        <rect x="20" y="40" width="24" height="7" fill={WHITE} />
        <path d="M22,40 C22,30 26,26 32,18 C38,26 42,30 42,40 Z" fill={GOLD} />
        <path d="M32,6 L35,19 H29 Z" fill={GOLD_LIGHT} />
      </>
    ),
  },
  wat_phan_tao: {
    description: "long dark teak viharn with a three-tier roof, gold chofa finials and a gold peacock pediment",
    draw: () => (
      <>
        <rect x="8" y="40" width="48" height="18" rx="1.5" fill={TEAK} />
        <path d="M18,44 v10 M28,44 v10 M38,44 v10 M48,44 v10" stroke={GOLD} strokeWidth="1" />
        <path d="M4,40 L14,30 H50 L60,40 Z" fill={TEAK_DARK} />
        <path d="M14,30 L22,20 H42 L50,30 Z" fill={TEAK_DARK} />
        <path d="M22,20 L28,12 H36 L42,20 Z" fill={TEAK_DARK} />
        <path d="M28,12 l-2,-4 M36,12 l2,-4 M4,40 l-2,-3 M60,40 l2,-3" stroke={GOLD} strokeWidth="1.5" />
        <circle cx="32" cy="26" r="3" fill={GOLD} />
      </>
    ),
  },
  wat_lok_moli: {
    description: "tall square brick Lanna chedi with a deep niche and a stepped top",
    draw: () => (
      <>
        <rect x="14" y="50" width="36" height="8" rx="1.5" fill={BRICK_DARK} />
        <path d="M18,50 L20,26 H44 L46,50 Z" fill={BRICK} />
        <path d="M29,40 a3,4 0 0 1 6,0 V50 H29 Z" fill={TEAK_DARK} />
        <path d="M22,26 L24,18 H40 L42,26 Z" fill={BRICK_DARK} />
        <path d="M26,18 C26,12 29,10 32,7 C35,10 38,12 38,18 Z" fill={BRICK} />
        <path d="M32,2 L33.5,8 H30.5 Z" fill={GOLD} />
      </>
    ),
  },
  wat_suan_dok: {
    description: "large white bell chedi with a gold spire, surrounded by a field of small white chedis",
    draw: () => (
      <>
        <path d="M3,58 C3,50 5,48 8,44 C11,48 13,50 13,58 Z M51,58 C51,50 53,48 56,44 C59,48 61,50 61,58 Z M14,58 C14,52 15,51 17,48 C19,51 20,52 20,58 Z M44,58 C44,52 45,51 47,48 C49,51 50,52 50,58 Z" fill={WHITE} />
        <path d="M8,42 l1.5,3 h-3 Z M56,42 l1.5,3 h-3 Z" fill={GOLD} stroke="none" />
        <rect x="20" y="50" width="24" height="8" rx="1.5" fill={WHITE} />
        <path d="M22,50 C22,36 26,30 32,20 C38,30 42,36 42,50 Z" fill={WHITE} />
        <path d="M32,8 L35,21 H29 Z" fill={GOLD} />
        <path d="M26,44 H38" stroke={GOLD} strokeWidth="1.2" />
      </>
    ),
  },
  wat_umong: {
    description: "green forest mound pierced by three dark tunnel arches, an old brick chedi on top",
    draw: () => (
      <>
        <path d="M4,58 C8,36 24,30 32,30 C40,30 56,36 60,58 Z" fill={GREEN} />
        <path d="M14,58 v-6 a5,6 0 0 1 10,0 v6 Z M27,58 v-6 a5,6 0 0 1 10,0 v6 Z M40,58 v-6 a5,6 0 0 1 10,0 v6 Z" fill={TEAK_DARK} />
        <path d="M26,32 C26,24 29,22 32,16 C35,22 38,24 38,32 Z" fill={BRICK} />
        <path d="M32,10 L33.5,17 H30.5 Z" fill={BRICK_DARK} />
        <circle cx="12" cy="40" r="3.5" fill={GREEN_DARK} />
        <circle cx="52" cy="40" r="3.5" fill={GREEN_DARK} />
      </>
    ),
  },
  wat_jed_yod: {
    description: "wide stucco shrine crowned by seven spires, five in front and two behind",
    draw: () => (
      <>
        <path d="M14,34 l6,-16 l6,16 Z M38,34 l6,-16 l6,16 Z" fill="#b98459" />
        <rect x="6" y="48" width="52" height="10" rx="1.5" fill={STUCCO} />
        <rect x="10" y="34" width="44" height="14" fill={STUCCO} />
        <path d="M11,34 l4,-12 l4,12 Z M20,34 l4,-14 l4,14 Z M28,34 l4,-20 l4,20 Z M36,34 l4,-14 l4,14 Z M45,34 l4,-12 l4,12 Z" fill={BRICK} />
        <path d="M16,48 v-7 a2,2.5 0 0 1 4,0 v7 Z M30,48 v-7 a2,2.5 0 0 1 4,0 v7 Z M44,48 v-7 a2,2.5 0 0 1 4,0 v7 Z" fill={TEAK_DARK} />
      </>
    ),
  },
  wat_ket_karam: {
    description: "white chedi on the east bank with a teak pier on posts reaching over the water",
    draw: () => (
      <>
        <rect x="30" y="52" width="34" height="6" rx="2" fill={WATER} />
        <path d="M38,51 v6 M50,51 v6 M58,51 v6" stroke={TEAK} />
        <rect x="34" y="48" width="26" height="3" fill={TEAK} />
        <rect x="8" y="50" width="26" height="8" rx="1.5" fill={WHITE} />
        <path d="M10,50 C10,38 14,33 21,24 C28,33 32,38 32,50 Z" fill={WHITE} />
        <path d="M21,12 L24,25 H18 Z" fill={GOLD} />
      </>
    ),
  },
  wat_bupparam: {
    description: "ornate white viharn with gold pilasters and a three-tier gold roof",
    draw: () => (
      <>
        <rect x="10" y="40" width="44" height="18" rx="1.5" fill={WHITE} />
        <path d="M16,40 v18 M48,40 v18" stroke={GOLD} strokeWidth="1.5" />
        <path d="M29,58 v-9 a3,3 0 0 1 6,0 v9 Z" fill={TEAK} />
        <path d="M6,40 L16,28 H48 L58,40 Z" fill={GOLD_LIGHT} />
        <path d="M16,28 L22,18 H42 L48,28 Z" fill={GOLD} />
        <path d="M22,18 L27,10 H37 L42,18 Z" fill={GOLD_LIGHT} />
        <path d="M27,10 l-2,-4 M37,10 l2,-4 M6,40 l-2,-3 M58,40 l2,-3" stroke={GOLD} strokeWidth="1.5" />
        <circle cx="32" cy="24" r="2.5" fill={WHITE} />
      </>
    ),
  },
  wat_mahawan: {
    description: "bulbous Burmese gold chedi with a tiered hti umbrella on a wide white base with corner spires",
    draw: () => (
      <>
        <rect x="8" y="50" width="48" height="8" rx="1.5" fill={WHITE} />
        <rect x="14" y="44" width="36" height="6" fill={WHITE} />
        <path d="M9,50 l3,-6 l3,6 Z M49,50 l3,-6 l3,6 Z" fill={GOLD} />
        <path d="M18,44 C17,30 22,24 32,16 C42,24 47,30 46,44 Z" fill={GOLD} />
        <path d="M22,38 H42" stroke={WHITE} strokeWidth="1.5" />
        <path d="M26,14 H38 M28,11 H36 M30,8 H34 M32,8 V3" stroke={GOLD} strokeWidth="2" />
      </>
    ),
  },
  wat_saen_fang: {
    description: "tall slender Burmese chedi, white body banded in gold with a gold crown and hti",
    draw: () => (
      <>
        <rect x="16" y="52" width="32" height="6" rx="1.5" fill={WHITE} />
        <rect x="20" y="46" width="24" height="6" fill={GOLD_LIGHT} />
        <path d="M22,46 C22,32 26,24 32,8 C38,24 42,32 42,46 Z" fill={WHITE} />
        <path d="M27,22 C28,16 30,12 32,8 C34,12 36,16 37,22 Z" fill={GOLD} />
        <path d="M24,40 H40 M25,34 H39" stroke={GOLD} strokeWidth="1.2" />
        <path d="M28,8 H36 M30,5 H34 M32,5 V2" stroke={GOLD} strokeWidth="1.5" />
      </>
    ),
  },
  wat_chetawan: {
    description: "three chedis in a row on one platform, a taller gold one between two white",
    draw: () => (
      <>
        <rect x="4" y="52" width="56" height="6" rx="1.5" fill={WHITE} />
        <path d="M6,52 C6,42 9,38 14,30 C19,38 22,42 22,52 Z M42,52 C42,42 45,38 50,30 C55,38 58,42 58,52 Z" fill={WHITE} />
        <path d="M23,52 C23,38 27,32 32,22 C37,32 41,38 41,52 Z" fill={GOLD} />
        <path d="M14,22 l2,8 h-4 Z M32,12 l2.5,10 h-5 Z M50,22 l2,8 h-4 Z" fill={GOLD_LIGHT} />
      </>
    ),
  },
  wat_chai_mongkhon: {
    description: "small riverside viharn on the west bank with a long-tail boat moored on the water",
    draw: () => (
      <>
        <rect x="2" y="50" width="60" height="8" rx="2" fill={WATER} />
        <rect x="2" y="46" width="42" height="6" rx="1" fill={STUCCO} />
        <rect x="8" y="34" width="30" height="12" rx="1.5" fill={WHITE} />
        <path d="M4,34 L14,22 H32 L42,34 Z M14,22 L18,15 H28 L32,22 Z" fill={TEAK_DARK} />
        <path d="M18,15 l-2,-3 M28,15 l2,-3" stroke={GOLD} strokeWidth="1.5" />
        <path d="M42,54 Q50,60 60,54 L58,51 H44 Z" fill={TEAK} />
        <rect x="48" y="47" width="7" height="4" rx="1" fill={GOLD_LIGHT} />
      </>
    ),
  },
  wat_srisuphan: {
    description: "silver ubosot, walls and three-tier roof all in hammered silver with a white sheen",
    draw: () => (
      <>
        <rect x="10" y="40" width="44" height="18" rx="1.5" fill={SILVER} />
        <path d="M18,44 v10 M46,44 v10" stroke={SILVER_DARK} />
        <path d="M29,58 v-9 a3,3 0 0 1 6,0 v9 Z" fill={SILVER_DARK} />
        <path d="M6,40 L16,28 H48 L58,40 Z" fill={SILVER_DARK} />
        <path d="M16,28 L22,18 H42 L48,28 Z" fill={SILVER} />
        <path d="M22,18 L27,10 H37 L42,18 Z" fill={SILVER_DARK} />
        <path d="M27,10 l-2,-4 M37,10 l2,-4 M6,40 l-2,-3 M58,40 l2,-3" stroke={SILVER_DARK} strokeWidth="1.5" />
        <path d="M20,26 L26,21" stroke={WHITE} strokeWidth="1.5" />
      </>
    ),
  },
  wat_doi_suthep: {
    description: "golden chedi with gold chatra umbrellas on a green mountain top, the naga staircase zig-zagging up",
    draw: () => (
      <>
        <path d="M2,58 C10,40 20,30 32,24 C44,30 54,40 62,58 Z" fill={GREEN_DARK} />
        <path d="M12,58 C18,44 26,36 32,32 C38,36 46,44 52,58 Z" fill={GREEN} />
        <path d="M32,34 L28,40 L34,46 L28,52 L32,58" stroke={STUCCO} strokeWidth="2" fill="none" />
        <rect x="22" y="28" width="20" height="5" rx="1" fill={WHITE} />
        <path d="M25,28 C25,20 28,17 32,12 C36,17 39,20 39,28 Z" fill={GOLD} />
        <path d="M32,3 L34.5,13 H29.5 Z" fill={GOLD_LIGHT} />
        <path d="M22,27 l-3,-5 M42,27 l3,-5" stroke={GOLD} strokeWidth="1.5" />
      </>
    ),
  },
};

export const SYMBOL_IDS = Object.keys(TEMPLE_SYMBOLS);

/** The symbol in its 64 x 64 box; the wrapper sets size, shadow and state. */
export function TempleGlyph({ id, size = 56 }: { id: string; size?: number }) {
  const sym = TEMPLE_SYMBOLS[id] ?? FALLBACK;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="32" cy="58.5" rx="20" ry="3.5" fill="#2b1d12" opacity="0.14" stroke="none" />
      {sym.draw()}
    </svg>
  );
}

const FALLBACK: TempleSymbol = {
  description: "generic gold chedi",
  draw: () => (
    <>
      <rect x="18" y="50" width="28" height="8" rx="1.5" fill={WHITE} />
      <path d="M20,50 C20,36 25,30 32,20 C39,30 44,36 44,50 Z" fill={GOLD} />
      <path d="M32,8 L35,21 H29 Z" fill={GOLD_LIGHT} />
    </>
  ),
};
