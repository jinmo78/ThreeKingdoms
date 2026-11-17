// 원정 지도. 진행·드롭·출진 함수는 그대로 두고 고르는 화면만 고지도로 보여 준다.
// 그림(한지 질감·산수·성루·두루마리)은 SVG와 index.css(.war-*, .gate, .silk 등)로만 그린다.
import { Lock, Swords } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { GearArt } from '../components/GearArt';
import { MarchList, SiegePanel } from '../components/SiegePanel';
import { cn } from '../components/ui';
import { GENERAL_MAP } from '../data/generals';
import { GEAR_MAP, stageGearId } from '../data/gear';
import { TROOP } from '../data/meta';
import { CHAPTERS, isUnlocked, STAGE_MAP, stageIndex, STAGES } from '../data/stages';
import { matchupGrade, matchupVs } from '../engine/matchup';
import { enemyUnitsToProfiles } from '../engine/profiles';
import { GARRISON_RECOVER_MS, MIN_SORTIE, SQUAD_RECOVER_MS, garrisonKey, marchMs, ratioOf, squadKey } from '../engine/siege';
import type { UnitProfile } from '../engine/unit';
import { enemyProfiles, unitProfile, useGame } from '../store/gameStore';
import type { EnemyUnit, GearSlot, Troop } from '../types';

type GearFilter = 'all' | GearSlot;

const FILTERS: readonly [GearFilter, string, string][] = [
  ['all', '全', '전체'],
  ['weapon', '劍', '무기'],
  ['armor', '甲', '갑주'],
  ['tome', '書', '서책'],
];
const SLOT_HAN: Record<GearSlot, string> = { weapon: '劍', armor: '甲', tome: '書' };

/* ───────── 지도 좌표 (viewBox 400 × MAP_H, 노드는 % 로 얹는다) ───────── */
const VW = 400;
const ROW = 124;
const HEAD = 76;
const TOP = 24;
const BOT = 80;

type Spot = { x: number; y: number };
const { SPOTS, HEADS, MAP_H } = (() => {
  const spots: Spot[] = [];
  const heads: { id: number; title: string; year: string; y: number }[] = [];
  let y = TOP;
  STAGES.forEach((s, i) => {
    if (STAGES[i - 1]?.chapter !== s.chapter) {
      const c = CHAPTERS.find((ch) => ch.id === s.chapter);
      if (c) heads.push({ id: c.id, title: c.title, year: c.year, y: y + HEAD / 2 });
      y += HEAD;
    }
    const side = i % 2 === 0 ? -1 : 1;
    spots.push({ x: 200 + side * (78 + 30 * Math.sin(i * 1.9)), y: y + 38 });
    y += ROW;
  });
  return { SPOTS: spots, HEADS: heads, MAP_H: y + BOT };
})();

/** 노드 i → i+1 을 잇는 S자 곡선 */
const SEGMENTS = SPOTS.slice(0, -1).map((a, i) => {
  const b = SPOTS[i + 1];
  const k = (b.y - a.y) * 0.55;
  return `M${a.x} ${a.y}C${a.x} ${a.y + k} ${b.x} ${b.y - k} ${b.x} ${b.y}`;
});

/* ───────── 지형: 겹산 · 대하 · 수풀 · 주(州) 이름 (시드 고정이라 항상 같은 그림) ───────── */
type Pt = [number, number];
const f1 = (n: number) => Math.round(n * 10) / 10;
const lineTo = (pts: Pt[]) => pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 봉우리 하나: 좌측 면(옅은 황토) · 우측 면(짙은 고동) · 능선 · 준법(주름) 선. 원점은 산자락 중앙. */
function peakEl(rand: () => number, key: number, cx: number, base: number, w: number, h: number): ReactNode {
  const ax = cx + (rand() - 0.5) * w * 0.14;
  const ay = base - h;
  const mx = ax + w * 0.06; // 능선이 산자락에 닿는 점
  const edge = (x0: number): Pt[] => {
    const out: Pt[] = [[x0, base]];
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      out.push([x0 + (ax - x0) * Math.pow(t, 0.72) + (rand() - 0.5) * w * 0.07 * (1 - t), base - h * t]);
    }
    out.push([ax, ay]);
    return out;
  };
  const le = edge(cx - w / 2);
  const re = edge(cx + w / 2);
  const ridge: Pt[] = [[ax, ay]];
  for (let i = 1; i <= 4; i++) {
    const t = i / 4.2;
    ridge.push([ax + (mx - ax) * t + (rand() - 0.5) * w * 0.2 * (1 - t * 0.3), ay + h * t]);
  }
  ridge.push([mx, base]);
  const hatch = ridge.slice(1, 5)
    .map(([x, y]) => `M${f1(x)} ${f1(y)}l${f1(w * (0.12 + 0.12 * rand()))} ${f1(h * (0.1 + 0.08 * rand()))}`)
    .join('');
  return (
    <g key={key}>
      <path d={`M${lineTo([...le, ...ridge.slice(1)])}Z`} fill="url(#cm-mt-l)" />
      <path d={`M${lineTo([...re].reverse().concat([...ridge].reverse()))}Z`} fill="url(#cm-mt-r)" />
      <g fill="none" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: 'var(--mt-line)' }}>
        <path d={`M${lineTo(le)}`} strokeWidth=".7" opacity=".6" />
        <path d={`M${lineTo(re)}`} strokeWidth=".7" opacity=".6" />
        <path d={`M${lineTo(ridge)}`} strokeWidth="1" opacity=".85" />
        <path d={hatch} strokeWidth=".6" opacity=".4" />
      </g>
    </g>
  );
}

/** 산맥 클러스터 5종(a 연봉 · b 협곡의 높은 벽 · c 낮은 구릉 · d 쌍봉 · e 검각 같은 뾰족한 봉우리) × 변형 2 */
const KINDS = {
  a: { n: 5, W: 120, H: 85, ratio: 1.1 },
  b: { n: 4, W: 80, H: 125, ratio: 0.62 },
  c: { n: 5, W: 140, H: 42, ratio: 1.8 },
  d: { n: 3, W: 80, H: 70, ratio: 1.0 },
  e: { n: 6, W: 120, H: 110, ratio: 0.7 },
} as const;
type Kind = keyof typeof KINDS;

const CLUSTERS: ReactNode[] = (() => {
  const rand = mulberry32(220);
  let key = 0;
  const out: ReactNode[] = [];
  (Object.keys(KINDS) as Kind[]).forEach((k) => {
    for (let v = 0; v < 2; v++) {
      const { n, W, H, ratio } = KINDS[k];
      const ps = Array.from({ length: n }, (_, i) => {
        const pos = (i + 0.5) / n - 0.5;
        const h = Math.min(H * 1.05, H * (0.45 + 0.55 * (1 - Math.abs(pos) * 1.1)) * (0.8 + 0.3 * rand()));
        const back = i % 2 === 0; // 번갈아 뒤(멀리, 흐리게) · 앞
        return { cx: (pos + (rand() - 0.5) * 0.12) * W, h, w: h * ratio * (0.9 + 0.3 * rand()), back, base: back ? -(9 + rand() * 6) : 0 };
      });
      const back = ps.filter((p) => p.back);
      const front = ps.filter((p) => !p.back).sort((a, b) => a.h - b.h);
      out.push(
        <g key={`${k}${v}`} id={`cm-mt-${k}${v}`}>
          <g opacity=".55">{back.map((p) => peakEl(rand, key++, p.cx, p.base, p.w, p.h * 1.05))}</g>
          {front.map((p) => peakEl(rand, key++, p.cx, p.base, p.w, p.h))}
        </g>,
      );
    }
  });
  return out;
})();

/** 점들을 부드럽게 잇는 Catmull-Rom 곡선 */
function catmull(p: Pt[], per: number): Pt[] {
  const q = [p[0], ...p, p[p.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < q.length - 2; i++) {
    const [p0, p1, p2, p3] = [q[i - 1], q[i], q[i + 1], q[i + 2]];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([c(0), c(1)]);
    }
  }
  out.push(p[p.length - 1]);
  return out;
}

interface River {
  d: string; edgeL: string; edgeR: string; inL: string; inR: string;
  ripples: { x: number; y: number; a: number; s: number }[];
  label: { t: string; x: number; y: number; a: number } | null;
  pts: Pt[]; half: number; z: number;
}

/** 중심선을 따라 폭이 변하는 큰 강. 폭 = w0 × (0.72 ± 변화). */
function makeRiver(ctrl: Pt[], w0: number, phase: number, rand: () => number, label?: { t: string; x: number }): River {
  const c = catmull(ctrl, 14);
  const n = c.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  const IL: Pt[] = [];
  const IR: Pt[] = [];
  const tan: Pt[] = [];
  c.forEach((p, i) => {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const tx = (b[0] - a[0]) / len;
    const ty = (b[1] - a[1]) / len;
    tan.push([tx, ty]);
    const t = i / (n - 1);
    const w = (w0 * (0.72 + 0.26 * Math.sin(t * 8 + phase) + 0.14 * Math.sin(t * 21 + phase * 1.7))) / 2;
    // 물가가 매끈하지 않도록 양쪽 기슭에 잔 굴곡을 기하에 직접 넣는다(변위 필터 대신).
    const wl = w * (1 + 0.14 * Math.sin(t * 57 + phase * 3) + 0.08 * Math.sin(t * 131 + phase));
    const wr = w * (1 + 0.14 * Math.sin(t * 61 + phase * 2 + 1.3) + 0.08 * Math.sin(t * 127 + phase + 2));
    L.push([p[0] - ty * wl, p[1] + tx * wl]);
    R.push([p[0] + ty * wr, p[1] - tx * wr]);
    IL.push([p[0] - ty * wl * 0.74, p[1] + tx * wl * 0.74]);
    IR.push([p[0] + ty * wr * 0.74, p[1] - tx * wr * 0.74]);
  });
  const ripples: River['ripples'] = [];
  for (let i = 3; i < n; i += 4) {
    if (rand() < 0.2) continue;
    const o = (rand() * 2 - 1) * 0.55;
    ripples.push({
      x: c[i][0] + (L[i][0] - c[i][0]) * o,
      y: c[i][1] + (L[i][1] - c[i][1]) * o,
      a: (Math.atan2(tan[i][1], tan[i][0]) * 180) / Math.PI,
      s: 0.8 + rand() * 0.7,
    });
  }
  let lab: River['label'] = null;
  if (label) {
    let bi = 0;
    c.forEach((p, i) => { if (Math.abs(p[0] - label.x) < Math.abs(c[bi][0] - label.x)) bi = i; });
    lab = { t: label.t, x: c[bi][0], y: c[bi][1], a: (Math.atan2(tan[bi][1], tan[bi][0]) * 180) / Math.PI };
  }
  return {
    d: `M${lineTo(L)}L${lineTo([...R].reverse())}Z`,
    edgeL: `M${lineTo(L)}`, edgeR: `M${lineTo(R)}`, inL: `M${lineTo(IL)}`, inR: `M${lineTo(IR)}`,
    ripples, label: lab, pts: c.filter((_, i) => i % 3 === 0), half: w0 * 0.56, z: 0,
  };
}

/* 장(章)마다 지형이 달라진다: 1 기주 평야 · 2 사수관/호뢰관 협곡 · 3 관도 황하 · 4 적벽 장강
   · 5 합비 강가 · 6 한중 산지 · 7 이릉 숲 · 8 검각 험산 */
const THEME: Record<number, { kinds: Kind[]; n: number; s: [number, number]; trees: number }> = {
  1: { kinds: ['c', 'd', 'c'], n: 8, s: [0.8, 1.1], trees: 16 },
  2: { kinds: ['b', 'e', 'b', 'a'], n: 13, s: [0.95, 1.35], trees: 12 },
  3: { kinds: ['c', 'd'], n: 6, s: [0.7, 1], trees: 10 },
  4: { kinds: ['d', 'a', 'c'], n: 7, s: [0.8, 1.15], trees: 10 },
  5: { kinds: ['c', 'a'], n: 7, s: [0.8, 1.05], trees: 14 },
  6: { kinds: ['a', 'b', 'e'], n: 11, s: [0.95, 1.3], trees: 12 },
  7: { kinds: ['a', 'd', 'b'], n: 10, s: [0.9, 1.25], trees: 26 },
  8: { kinds: ['e', 'b', 'e'], n: 13, s: [1, 1.4], trees: 8 },
};
const STATE_NAMES: Record<number, string[]> = {
  1: ['冀州', '幽州'], 2: ['司隸'], 3: ['兗州', '豫州'], 4: ['荊州'], 5: ['揚州'], 6: ['漢中'], 7: ['益州'], 8: ['雍州'],
};

const ZONES = HEADS.map((h, i) => ({
  id: h.id,
  y0: h.y - HEAD / 2,
  y1: i + 1 < HEADS.length ? HEADS[i + 1].y - HEAD / 2 : MAP_H,
}));

/** 진군로를 촘촘히 찍은 점들. 산·나무가 길 위에 앉지 않게 거르는 데 쓴다. */
const ROAD_PTS: Pt[] = [];
SPOTS.slice(0, -1).forEach((a, i) => {
  const b = SPOTS[i + 1];
  const k = (b.y - a.y) * 0.55;
  for (let s = 0; s < 16; s++) {
    const t = s / 16;
    const u = 1 - t;
    ROAD_PTS.push([
      a.x * (u * u * u + 3 * u * u * t) + b.x * (3 * u * t * t + t * t * t),
      a.y * u * u * u + (a.y + k) * 3 * u * u * t + (b.y - k) * 3 * u * t * t + b.y * t * t * t,
    ]);
  }
});
const near = (pts: Pt[], x: number, y: number, d: number) => pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < d);

/** (x,y)에 반경 r 짜리 지형을 놓아도 길 · 성 · 장 현판 · 강과 겹치지 않는가 */
function isFree(x: number, y: number, r: number, rivers: River[]) {
  if (Math.hypot(x - 54, y - (MAP_H - 46)) < 52 + r) return false; // 방위표 자리
  if (near(ROAD_PTS, x, y, r * 0.4 + 24) || near(ROAD_PTS, x, y - r * 0.8, r * 0.4 + 24)) return false;
  if (SPOTS.some((s) => Math.hypot(s.x - x, s.y + 24 - (y - r * 0.3)) < r * 0.5 + 62)) return false;
  if (HEADS.some((h) => Math.abs(h.y - (y - r * 0.3)) < 30 + r * 0.4 && Math.abs(x - 200) < 100 + r)) return false;
  return !rivers.some((rv) => near(rv.pts, x, y, rv.half + 8 + r * 0.15));
}
function place(rand: () => number, z: { y0: number; y1: number }, r: number, rivers: River[], tries = 40): Pt | null {
  for (let t = 0; t < tries; t++) {
    const x = -70 + rand() * 540;
    const y = z.y0 + 60 + rand() * (z.y1 - z.y0 - 40);
    if (isFree(x, y, r, rivers)) return [x, y];
  }
  return null;
}

const TERRAIN = (() => {
  const rand = mulberry32(1914);
  const zy = (c: number) => ZONES.find((z) => z.id === c)?.y0 ?? 0;
  /** 지도 가장자리를 따라 굽이치는 지류 */
  const margin = (c: number, side: -1 | 1, w: number, phase: number) => {
    const ctrl: Pt[] = [];
    for (let k = 0; k < 6; k++) ctrl.push([side < 0 ? 28 + 32 * Math.sin(k * 1.7 + phase) : 372 - 32 * Math.sin(k * 1.7 + phase), zy(c) + k * 90 - 10]);
    return makeRiver(ctrl, w, phase, rand);
  };
  // 대하는 성·명패 사이 틈으로 지나가도록 왼쪽은 낮게, 오른쪽은 높게 흐른다.
  const rivers: River[] = [
    margin(1, -1, 11, 1),
    margin(2, 1, 9, 2.4),
    makeRiver([[-260, 225], [-80, 228], [60, 222], [150, 218], [240, 190], [330, 165], [470, 160], [660, 172]].map(([x, y]) => [x, y + zy(3)] as Pt), 36, 0.6, rand, { t: '黃河', x: 30 }),
    makeRiver([[-260, 340], [-60, 345], [100, 338], [200, 320], [300, 292], [400, 282], [520, 280], [660, 290]].map(([x, y]) => [x, y + zy(4)] as Pt), 42, 2.2, rand, { t: '長江', x: 350 }),
    margin(5, -1, 15, 3.1),
    margin(6, 1, 18, 4.2),
    makeRiver([[-200, 225], [-20, 222], [110, 215], [210, 200], [300, 178], [420, 170], [600, 175]].map(([x, y]) => [x, y + zy(7)] as Pt), 30, 5.1, rand),
    margin(8, 1, 9, 5.7),
  ];

  rivers.forEach((r, i) => { r.z = i + 1; }); // 위에서부터 1~8장 순서

  type Item = { id: string; x: number; y: number; s: number };
  const zones = ZONES.map((z) => {
    const th = THEME[z.id] ?? THEME[1];
    const mts: Item[] = [];
    const trees: Item[] = [];
    const mists: { x: number; y: number; rx: number; ry: number }[] = [];
    const tree = (x: number, y: number): Item => ({ id: rand() < 0.75 ? 'cm-pine' : 'cm-bush', x, y, s: 0.8 + rand() * 0.5 });
    for (let i = 0; i < th.n; i++) {
      const kind = th.kinds[Math.floor(rand() * th.kinds.length)];
      const s = th.s[0] + rand() * (th.s[1] - th.s[0]);
      const { W } = KINDS[kind];
      const p = place(rand, z, (W * s) / 2, rivers);
      if (!p) continue;
      mts.push({ id: `cm-mt-${kind}${rand() < 0.5 ? 0 : 1}`, x: p[0], y: p[1], s });
      mists.push({ x: p[0], y: p[1], rx: W * s * 0.7, ry: 9 * s });
      for (let j = 2 + Math.floor(rand() * 3); j > 0; j--) {
        const tx = p[0] + (rand() - 0.5) * W * s * 1.4;
        const ty = p[1] + 2 + rand() * 12 * s;
        if (isFree(tx, ty, 10, rivers)) trees.push(tree(tx, ty));
      }
    }
    for (let i = 0; i < th.trees; i++) {
      const p = place(rand, z, 12, rivers, 12);
      if (p) trees.push(tree(p[0], p[1]));
    }
    mts.sort((a, b) => a.y - b.y);
    trees.sort((a, b) => a.y - b.y);
    return { id: z.id, mts, trees, mists };
  });

  // 지도 여백의 주(州) 이름: 번갈아 먹 글씨 · 주홍 인장
  const marks: { z: number; t: string; x: number; y: number; seal: boolean; rot: number }[] = [];
  ZONES.forEach((z) => {
    (STATE_NAMES[z.id] ?? []).forEach((t, i) => {
      const p = place(rand, z, 46, rivers, 80);
      if (p) marks.push({ z: z.id, t, x: p[0], y: p[1] - 20, seal: (i + z.id) % 2 === 1, rot: -8 + rand() * 12 });
    });
  });
  return { rivers, zones, marks };
})();

/** 성루·지형 공용 정의. 성루 24개, 산·나무·물결이 <use> 로 한 번만 그린 그림을 가져다 쓴다. */
function MapDefs() {
  return (
    <defs>
      <linearGradient id="cm-stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b3a98f" />
        <stop offset="1" stopColor="#766e5d" />
      </linearGradient>
      <linearGradient id="cm-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2d98f" />
        <stop offset="1" stopColor="#a9822f" />
      </linearGradient>
      <linearGradient id="cm-roof" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#566a65" />
        <stop offset="1" stopColor="#202b29" />
      </linearGradient>
      <radialGradient id="cm-mist">
        <stop offset="0" stopColor="#fff8e6" stopOpacity="0.75" />
        <stop offset="1" stopColor="#fff8e6" stopOpacity="0" />
      </radialGradient>
      {/* 산: 좌측 면은 옅은 황토, 우측 면은 짙은 고동(#4A3B2C). 산자락으로 갈수록 안개에 묻힌다. */}
      <linearGradient id="cm-mt-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--mt-l)' }} />
        <stop offset="1" style={{ stopColor: 'var(--mt-l)' }} stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id="cm-mt-r" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--mt-r)' }} />
        <stop offset="1" style={{ stopColor: 'var(--mt-r)' }} stopOpacity="0.55" />
      </linearGradient>
      {/* 강: 낡은 쪽빛 ~ 청회색 */}
      <linearGradient id="cm-water" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#627A82" />
        <stop offset="1" stopColor="#455A64" />
      </linearGradient>
      {/* 성 · 길 주변을 밝혀 지형 위에서도 또렷하게 */}
      <radialGradient id="cm-clearg">
        <stop offset="0" style={{ stopColor: 'var(--map-a)' }} stopOpacity="0.8" />
        <stop offset="1" style={{ stopColor: 'var(--map-a)' }} stopOpacity="0" />
      </radialGradient>
      <circle id="cm-clear" r="66" fill="url(#cm-clearg)" />
      {/* 먹이 번진 산 · 수풀 · 강의 거친 물가 */}
      <filter id="cm-ink" x="-5%" y="-8%" width="110%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.45" />
      </filter>
      <filter id="cm-bleed" x="-5%" y="-8%" width="110%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="8" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.7" />
      </filter>
      {CLUSTERS}
      <g id="cm-pine" style={{ fill: 'var(--tree)' }}>
        <rect x="-0.8" y="-3" width="1.6" height="5" />
        <path d="M0 -17L-5 -9H5Z" />
        <path d="M0 -13L-6.5 -4.5H6.5Z" />
        <path d="M0 -9L-8 -0.5H8Z" />
      </g>
      <g id="cm-bush" style={{ fill: 'var(--tree)' }}>
        <ellipse cx="-3" cy="-2" rx="4" ry="3" />
        <ellipse cx="2" cy="-3" rx="5" ry="3.5" />
        <ellipse cx="6" cy="-1.5" rx="3.5" ry="2.5" />
      </g>
      <path id="cm-ripple" d="M-7 0q1.75 -2.2 3.5 0t3.5 0t3.5 0t3.5 0" fill="none" stroke="#efe3c2" strokeWidth=".9" strokeLinecap="round" opacity=".6" />

      {/* 동양식 성루: 석축 + 문 + 2층 누각(붉은 기둥, 치켜 올린 기와지붕) + 깃대 */}
      <symbol id="cm-tower" viewBox="0 0 48 50">
        <polygon points="4,49 8,40 40,40 44,49" fill="url(#cm-stone)" />
        <path d="M7 44H41M6 46.6H42" stroke="#4a4338" strokeWidth=".6" opacity=".55" />
        <path d="M20.5 49V44.5a3.5 3.5 0 0 1 7 0V49Z" fill="#1d1915" />
        <rect x="7" y="39" width="34" height="1.7" fill="url(#cm-gold)" />
        <rect x="16" y="21" width="16" height="7" fill="#7a2820" />
        {[16, 23.2, 30.4].map((x) => <rect key={x} x={x} y="21" width="1.6" height="7" fill="#c04a3a" />)}
        <rect x="11" y="32" width="26" height="7.4" fill="#7a2820" />
        {[11, 19.4, 27.8, 35.4].map((x) => <rect key={x} x={x} y="32" width="1.6" height="7.4" fill="#c04a3a" />)}
        <path d="M2 33Q13 33 16 27H32Q35 33 46 33Q37 36.4 24 36.4Q11 36.4 2 33Z" fill="url(#cm-roof)" stroke="#16201e" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M16.5 27.4H31.5M6 33.4Q14 34.6 24 34.8" stroke="#9db3aa" strokeWidth=".7" opacity=".6" fill="none" />
        <path d="M8 19Q18 19 20.5 12.5H27.5Q30 19 40 19Q32 22.2 24 22.2Q16 22.2 8 19Z" fill="url(#cm-roof)" stroke="#16201e" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M21 13H27" stroke="#9db3aa" strokeWidth=".7" opacity=".6" />
        <rect x="22.6" y="10.2" width="2.8" height="2.4" fill="url(#cm-gold)" />
        <path d="M24 10.2V0.6" stroke="#5a3a1a" strokeWidth="1" />
        {([[2.4, 33], [45.6, 33], [8.4, 19], [39.6, 19]] as const).map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1" fill="url(#cm-gold)" />)}
      </symbol>
    </defs>
  );
}

/* ───────── 장(章) 단위 렌더링 ─────────
   지도를 8개 장 섹션으로 나누고 content-visibility:auto 를 건다. 화면에서 먼 장은 브라우저가 그리지 않는다.
   봉우리는 위로, 길은 아래 장으로 삐져나오는데 paint containment 가 섹션 상자 밖을 자르므로,
   상자를 위·아래로 넉넉히 넓혀 둔다. 층은 둘로 나눈다: 지형(아래) → 길·성(위). */
const SECTIONS = ZONES.map((z, i) => ({
  k: i,
  id: z.id,
  y0: i === 0 ? 0 : z.y0,
  y1: i + 1 < ZONES.length ? ZONES[i + 1].y0 : MAP_H,
}));
type Sec = (typeof SECTIONS)[number];
const OVER_TERRAIN: [number, number] = [200, 170]; // 봉우리가 위로 · 길 주변 밝힘이 아래로
const OVER_ROUTE: [number, number] = [60, 150]; // 현판이 위로 · 길이 다음 장으로
const idxIn = (n: number, sec: Sec) => Array.from({ length: n }, (_, i) => i).filter((i) => STAGES[i].chapter === sec.id);

const secBox = (s: Sec, [t, b]: [number, number]) => ({ top: s.y0 - t, h: s.y1 - s.y0 + t + b });

function Section({ sec, over, wide, children }: { sec: Sec; over: [number, number]; wide?: boolean; children: ReactNode }) {
  const { top, h } = secBox(sec, over);
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top: `${(top / MAP_H) * 100}%`,
        height: `${(h / MAP_H) * 100}%`,
        left: wide ? '-100%' : 0,
        right: wide ? '-100%' : 0,
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${Math.round(h)}px`,
      }}
    >
      {children}
    </div>
  );
}

/** 지형 한 장: 대하 · 주 이름 · 겹산 · 수풀, 그리고 길·성 주변을 밝히는 층(대비 확보). 상태와 무관해서 한 번만 그린다. */
const TerrainSection = memo(function TerrainSection({ sec }: { sec: Sec }) {
  const { top, h } = secBox(sec, OVER_TERRAIN);
  const z = TERRAIN.zones[sec.k];
  return (
    <Section sec={sec} over={OVER_TERRAIN} wide>
      {/* 옆으로 3배 넓은 상자: PC 에서 길 영역 밖으로 번지는 지형을 자르지 않기 위함 */}
      <svg className="absolute inset-0 h-full w-full" viewBox={`${-VW} ${f1(top)} ${VW * 3} ${f1(h)}`} aria-hidden>
        {TERRAIN.rivers.filter((r) => r.z === sec.id).map((r, i) => (
          <g key={i}>
            <path d={r.d} fill="none" stroke="#e8dcb8" strokeWidth="5" strokeLinejoin="round" opacity=".5" />
            <path d={r.d} fill="url(#cm-water)" stroke="#455A64" strokeWidth=".8" strokeLinejoin="round" />
            <g fill="none" strokeLinecap="round">
              <path d={r.inL} stroke="#a9c0c6" strokeWidth=".9" strokeDasharray="14 5 4 6" opacity=".55" />
              <path d={r.inR} stroke="#a9c0c6" strokeWidth=".9" strokeDasharray="6 4 12 5" opacity=".55" />
              <path d={r.edgeL} stroke="#efe3c2" strokeWidth="1.2" opacity=".7" />
              <path d={r.edgeR} stroke="#efe3c2" strokeWidth="1.2" opacity=".7" />
            </g>
            {r.ripples.map((p, j) => (
              <use key={j} href="#cm-ripple" transform={`translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(p.a)}) scale(${f1(p.s)})`} />
            ))}
            {r.label && (
              <text transform={`translate(${f1(r.label.x)} ${f1(r.label.y)}) rotate(${f1(r.label.a)})`} textAnchor="middle" dy="4"
                fontSize="12" fontWeight="900" letterSpacing="6" fill="#efe3c2" opacity=".75" style={{ fontFamily: 'var(--font-serif)' }}>
                {r.label.t}
              </text>
            )}
          </g>
        ))}

        {TERRAIN.marks.filter((m) => m.z === sec.id).map((m, i) => (
          <g key={i} transform={`translate(${f1(m.x)} ${f1(m.y)}) rotate(${f1(m.rot)})`} style={{ fontFamily: 'var(--font-serif)' }}>
            {m.seal ? (
              <>
                <rect x="-17" y="-38" width="34" height="76" rx="3" fill="none" stroke="#B8382E" strokeWidth="2.2" opacity=".3" />
                <text y="-8" textAnchor="middle" fontSize="26" fontWeight="900" fill="#B8382E" opacity=".3">{m.t[0]}</text>
                <text y="26" textAnchor="middle" fontSize="26" fontWeight="900" fill="#B8382E" opacity=".3">{m.t[1]}</text>
              </>
            ) : (
              <text textAnchor="middle" fontSize="40" fontWeight="900" letterSpacing="8" fill="currentColor" opacity=".13">{m.t}</text>
            )}
          </g>
        ))}

        <g filter="url(#cm-ink)" opacity=".92">
          {z.mts.map((m, i) => <use key={i} href={`#${m.id}`} transform={`translate(${f1(m.x)} ${f1(m.y)}) scale(${f1(m.s)})`} />)}
        </g>
        {z.mists.map((m, i) => <ellipse key={i} cx={f1(m.x)} cy={f1(m.y) - 1} rx={f1(m.rx)} ry={f1(m.ry)} fill="url(#cm-mist)" opacity=".7" />)}
        <g filter="url(#cm-bleed)">
          {z.trees.map((t, i) => <use key={i} href={`#${t.id}`} transform={`translate(${f1(t.x)} ${f1(t.y)}) scale(${f1(t.s)})`} />)}
        </g>

        {/* 길과 성 주변을 한지색으로 밝혀 산·강 위에서도 노드와 점선이 또렷하게 */}
        <g fill="none" strokeLinecap="round" style={{ stroke: 'var(--map-a)' }}>
          {idxIn(SEGMENTS.length, sec).map((i) => <path key={`w${i}`} d={SEGMENTS[i]} strokeWidth="38" opacity=".2" />)}
          {idxIn(SEGMENTS.length, sec).map((i) => <path key={`n${i}`} d={SEGMENTS[i]} strokeWidth="22" opacity=".3" />)}
        </g>
        {idxIn(SPOTS.length, sec).map((i) => <use key={i} href="#cm-clear" x={SPOTS[i].x} y={SPOTS[i].y + 16} />)}

        {/* 방위표 */}
        {sec.k === SECTIONS.length - 1 && (
          <g transform={`translate(54 ${MAP_H - 46})`} opacity=".85">
            <circle r="42" fill="url(#cm-clearg)" />
            <circle r="30" fill="none" stroke="#8a6230" strokeWidth="1" />
            <circle r="25" fill="none" stroke="#8a6230" strokeWidth=".6" strokeDasharray="2 2.4" />
            <path d="M0 -20L3.5 -3.5L20 0L3.5 3.5L0 20L-3.5 3.5L-20 0L-3.5 -3.5Z" transform="rotate(45)" fill="#8a6230" opacity=".35" />
            <path d="M0 -29L4.5 -4.5L29 0L4.5 4.5L0 29L-4.5 4.5L-29 0L-4.5 -4.5Z" fill="#8a6230" opacity=".55" />
            <path d="M0 -29L4.5 -4.5L-4.5 -4.5Z" fill="#b8382e" />
            <circle r="2.4" fill="#c5a059" />
            {([['北', 0, -34], ['南', 0, 43], ['東', 37, 4], ['西', -37, 4]] as const).map(([t, x, y]) => (
              <text key={t} x={x} y={y} textAnchor="middle" fontSize="9" fontWeight="900" fill="#8a6230" style={{ fontFamily: 'var(--font-serif)' }}>{t}</text>
            ))}
          </g>
        )}
      </svg>
    </Section>
  );
});

/** 길·성 한 장: 굽이치는 진군로(점령 구간은 주홍 붓길, 다음 구간은 금빛 점선) + 장 현판 + 성 노드 */
function RouteSection({
  sec, cleared, frontierId, frontierRef, filter, selected, powers, onSelect,
}: {
  sec: Sec; cleared: Record<string, number>; frontierId: string; frontierRef: RefObject<HTMLButtonElement>;
  filter: GearFilter; selected: string; powers: Record<string, number>; onSelect: (id: string) => void;
}) {
  const { top, h } = secBox(sec, OVER_ROUTE);
  const head = HEADS.find((x) => x.id === sec.id);
  const pct = (y: number) => `${((y - top) / h) * 100}%`;
  return (
    <Section sec={sec} over={OVER_ROUTE}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 ${f1(top)} ${VW} ${f1(h)}`} aria-hidden>
        {idxIn(SEGMENTS.length, sec).map((i) => {
          const id = STAGES[i].id;
          const st = (cleared[id] ?? 0) > 0 ? 'done' : id === frontierId ? 'front' : 'lock';
          return (
            <g key={i} className={`road road-${st}`}>
              <path className="road-wash" d={SEGMENTS[i]} />
              <path className="road-brush" d={SEGMENTS[i]} />
              <path className="road-gold" d={SEGMENTS[i]} />
            </g>
          );
        })}
      </svg>

      {head && (
        <div className="chapter-banner" style={{ top: pct(head.y) }}>
          <span>
            <b>제{head.id}장 {head.title}</b>
            <i>{head.year}</i>
          </span>
        </div>
      )}

      {idxIn(STAGES.length, sec).map((i) => {
        const s = STAGES[i];
        const unlocked = isUnlocked(s.id, cleared);
        const done = (cleared[s.id] ?? 0) > 0;
        const front = frontierId === s.id && !done;
        const gearId = stageGearId(s.chapter, i);
        const slot = gearId ? GEAR_MAP[gearId]?.slot : undefined;
        const lit = filter !== 'all' && slot === filter;
        const state = !unlocked ? 'locked' : done ? 'done' : front ? 'front' : 'open';
        return (
          <button
            key={s.id}
            type="button"
            ref={s.id === frontierId ? frontierRef : undefined}
            disabled={!unlocked}
            onClick={() => onSelect(s.id)}
            className="gate"
            data-state={state}
            data-sel={selected === s.id}
            data-lit={lit}
            data-dim={filter !== 'all' && !lit}
            aria-label={`${s.id} ${s.title}`}
            style={{ left: `${(SPOTS[i].x / VW) * 100}%`, top: pct(SPOTS[i].y) }}
          >
            <span className="medal">
              <Tower flag={done ? 'red' : 'dark'} wave={unlocked} delay={(i * 0.37) % 1.8} />
              {!unlocked && <span className="gate-badge gate-badge-lock -bottom-1 left-1/2 -translate-x-1/2"><Lock size={11} /></span>}
              {front && <span className="gate-badge -right-1.5 -top-1.5"><Swords size={11} /></span>}
              {lit && slot && <span className="gate-badge -right-1.5 -top-1.5">{SLOT_HAN[slot]}</span>}
            </span>
            <span className="plaque">
              <span>
                <b>{s.title}</b>
                <i>{s.id} · 전투력 {shortPower(powers[s.id] ?? 0)}</i>
              </span>
            </span>
          </button>
        );
      })}
    </Section>
  );
}

/** 성루 아이콘. 점령하면 금박 테두리의 주홍 군기, 아니면 어두운 적 깃발. */
function Tower({ flag, wave, delay }: { flag: 'red' | 'dark'; wave: boolean; delay: number }) {
  return (
    <svg viewBox="0 0 48 50" aria-hidden>
      <ellipse cx="24" cy="49" rx="20" ry="1.8" fill="#281908" opacity=".32" />
      <use href="#cm-tower" width="48" height="50" />
      <g className={wave ? 'flag-wave' : undefined} style={wave ? { animationDelay: `${-delay}s` } : undefined}>
        <path
          d="M24.6 1L38 4.6L24.6 8.2Z"
          fill={flag === 'red' ? '#c4352a' : '#3a342c'}
          stroke={flag === 'red' ? '#f0d58a' : '#6b6258'}
          strokeWidth=".9"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** 모서리 전통 문양. 부모에 position:relative 가 있어야 한다. */
const CORNER_POS = [
  { top: 2, left: 2 },
  { top: 2, right: 2, transform: 'scaleX(-1)' },
  { bottom: 2, left: 2, transform: 'scaleY(-1)' },
  { bottom: 2, right: 2, transform: 'scale(-1,-1)' },
] as const;

function Corners({ size = 26 }: { size?: number }) {
  return (
    <>
      {CORNER_POS.map((pos, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="pointer-events-none absolute z-[4]" style={pos} aria-hidden>
          <path d="M2 22V8Q2 2 8 2H22" fill="none" stroke="#1b1713" strokeWidth="3.2" opacity=".45" />
          <path d="M2 22V8Q2 2 8 2H22" fill="none" stroke="#C5A059" strokeWidth="1.5" />
          <path d="M6.5 17V11Q6.5 6.5 11 6.5H17" fill="none" stroke="#C5A059" strokeWidth=".9" opacity=".8" />
          <path d="M4.5 1.2L7.8 4.5L4.5 7.8L1.2 4.5Z" fill="#B8382E" stroke="#C5A059" strokeWidth=".8" />
          <circle cx="22" cy="2" r="1.1" fill="#C5A059" />
          <circle cx="2" cy="22" r="1.1" fill="#C5A059" />
        </svg>
      ))}
    </>
  );
}

function Compass() {
  return (
    <svg className="pointer-events-none absolute right-3 top-3 z-[2] h-12 w-12 opacity-70" viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="26" r="15" fill="none" stroke="#8a6230" strokeWidth=".9" />
      <circle cx="24" cy="26" r="11" fill="none" stroke="#8a6230" strokeWidth=".5" strokeDasharray="1.5 2" />
      <path d="M24 12L27 26L24 40L21 26Z" fill="#8a6230" opacity=".55" />
      <path d="M24 12L27 26H21Z" fill="#b8382e" />
      <path d="M10 26L24 23L38 26L24 29Z" fill="#8a6230" opacity=".4" />
      <text x="24" y="9" textAnchor="middle" fontSize="8" fontWeight="900" fill="#b8382e" fontFamily="serif">北</text>
    </svg>
  );
}

export default function Campaign() {
  const cleared = useGame((s) => s.cleared);
  const fought = useGame((s) => s.fought);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const wounds = useGame((s) => s.wounds);
  const startMarch = useGame((s) => s.startMarch);
  const resolveMarches = useGame((s) => s.resolveMarches);
  const marches = useGame((s) => s.marches);
  const setView = useGame((s) => s.setView);
  const focusStage = useGame((s) => s.focusStage);
  const setFocusStage = useGame((s) => s.setFocusStage);
  const [filter, setFilter] = useState<GearFilter>('all');
  const frontierRef = useRef<HTMLButtonElement>(null);

  const frontier = STAGES.find((s) => isUnlocked(s.id, cleared) && !(cleared[s.id] > 0)) ?? STAGES[STAGES.length - 1];
  const firstOpen = frontier;
  const [selected, setSelectedState] = useState(
    focusStage && STAGE_MAP[focusStage] && isUnlocked(focusStage, cleared) ? focusStage : firstOpen.id,
  );
  const setSelected = (id: string) => {
    setSelectedState(id);
    setFocusStage(id);
  };
  const stage = STAGE_MAP[selected] ?? firstOpen;

  // 부상 회복은 시간으로 계산하므로 몇 초마다 다시 읽는다
  const [now, setNow] = useState(() => Date.now());
  const marching = marches.length > 0;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), marching ? 1000 : 4000);
    return () => clearInterval(t);
  }, [marching]);
  // 도착한 부대가 있으면 전투를 푼다 (전투 화면이 열리면 이 페이지는 닫힌다)
  useEffect(() => {
    if (marches.some((m) => m.eta <= now)) resolveMarches();
  }, [now, marches, resolveMarches]);

  /** 출정 부대(편성 번호 · 병력 비율)와 지금 고른 부대. picked가 null이면 출정 가능한 부대 전부 */
  const squads = useMemo(() => {
    const away = new Set(marches.flatMap((m) => m.units.map((u) => u.commander)));
    return formation.flatMap((u, idx) => {
      const p = u.commander ? unitProfile(u, roster, gear) : null;
      return p ? [{ idx, p, r: ratioOf(wounds, squadKey(u.commander!), now, SQUAD_RECOVER_MS), busy: away.has(u.commander) }] : [];
    });
  }, [formation, roster, gear, wounds, now, marches]);
  const [picked, setPicked] = useState<number[] | null>(null);
  const picks = useMemo(
    () => new Set(squads.filter((s) => s.r >= MIN_SORTIE && !s.busy && (!picked || picked.includes(s.idx))).map((s) => s.idx)),
    [squads, picked],
  );
  const togglePick = (idx: number) => setPicked(picks.has(idx) ? [...picks].filter((i) => i !== idx) : [...picks, idx]);
  const mine = useMemo(() => squads.filter((s) => picks.has(s.idx)).map((s) => s.p), [squads, picks]);

  /** 성 수비대: 점령한 성은 새 수비대, 아니면 지난 공격에서 남은 병력 */
  const captured = (cleared[stage.id] ?? 0) > 0;
  const garrison = useMemo(() => stage.enemies
    .map((e, i) => ({ p: enemyUnitsToProfiles([e])[0], r: captured ? 1 : ratioOf(wounds, garrisonKey(stage.id, i), now, GARRISON_RECOVER_MS) }))
    .filter((g) => g.p && g.r > 0.001), [stage, captured, wounds, now]);
  const enemies = useMemo(() => (garrison.length ? garrison.map((g) => g.p) : enemyProfiles(stage.id)), [garrison, stage.id]);
  const powers = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of STAGES) out[s.id] = enemyProfiles(s.id).reduce((n, p) => n + p.power, 0);
    return out;
  }, []);

  useEffect(() => {
    frontierRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const clearedCount = STAGES.filter((s) => cleared[s.id]).length;
  const dropId = stageGearId(stage.chapter, stageIndex(stage.id));
  const drop = dropId ? GEAR_MAP[dropId] : undefined;

  return (
    <div className="pb-[20rem] lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:pb-0">
      <div className="min-w-0">
        <div className="mb-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-serif text-xl font-black tracking-wide">
              천하 원정 <span className="ml-1 text-[11px] font-bold tracking-[0.3em] text-[#B8382E]">天下遠征</span>
            </h2>
            <span className="text-xs font-bold text-stone-500">점령 {clearedCount}/{STAGES.length}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-[#1b1713]/80 p-px shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(clearedCount / STAGES.length) * 100}%`, background: 'linear-gradient(90deg,#8e2a22,#c4352a 60%,#E3C070)' }} />
          </div>
        </div>

        {/* 병법서 책갈피(죽간) 탭 */}
        <div className="slip-rail">
          <div className="slip-row grid grid-cols-4 gap-1.5 px-2">
            {FILTERS.map(([id, han, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className="slip" data-on={filter === id} aria-pressed={filter === id}>
                <span>
                  <b>{han}</b>
                  <i>{label}</i>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="frame war-map overflow-hidden">
          <Corners size={36} />
          <Compass />
          <div className="relative mx-auto w-full max-w-[34rem]" style={{ aspectRatio: `${VW} / ${MAP_H}` }}>
            {/* 정의(<defs>)는 한 번만: 성루 · 산 · 물결 · 그라데이션 · 필터를 모든 섹션이 <use> 로 가져다 쓴다 */}
            <svg width="0" height="0" className="absolute" aria-hidden><MapDefs /></svg>
            {SECTIONS.map((s) => <TerrainSection key={`t${s.id}`} sec={s} />)}
            {SECTIONS.map((s) => (
              <RouteSection key={`r${s.id}`} sec={s} cleared={cleared} frontierId={frontier.id} frontierRef={frontierRef}
                filter={filter} selected={selected} powers={powers} onSelect={setSelected} />
            ))}
          </div>
        </div>
      </div>

      <Briefing
        stageId={stage.id}
        title={stage.title}
        desc={stage.desc}
        done={(cleared[stage.id] ?? 0) > 0}
        enemies={enemies}
        mine={mine}
        dropId={dropId}
        dropName={drop?.name}
        noSquads={squads.length === 0}
        canFight={picks.size > 0}
        marchSec={Math.round(marchMs(stageIndex(stage.id)) / 1000)}
        fought={(fought[stage.id] ?? 0) > 0}
        stageEnemies={stage.enemies}
        onFight={() => { setFocusStage(stage.id); startMarch(stage.id, [...picks]); }}
        onFormation={() => setView('formation')}
      >
        <MarchList marches={marches} now={now} />
        <SiegePanel squads={squads} garrison={garrison} picks={picks} onToggle={togglePick} />
      </Briefing>
    </div>
  );
}

function shortPower(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString();
}

function mainTroop(enemies: UnitProfile[]): Troop | null {
  if (enemies.length === 0) return null;
  const counts: Record<Troop, number> = { cavalry: 0, infantry: 0, archer: 0 };
  for (const e of enemies) counts[e.troop]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Troop;
}

function gradeLabel(mine: UnitProfile[], enemies: UnitProfile[]) {
  if (mine.length === 0) return '편성 없음';
  const troops = enemies.map((e) => e.troop);
  const grades = mine.map((p) => matchupGrade(matchupVs(p.troop, troops)));
  const good = grades.filter((g) => g === 'good').length;
  const bad = grades.filter((g) => g === 'bad').length;
  if (bad > good) return '주의';
  if (good > bad) return '상성 유리';
  return '호각';
}

/** 나무 축목 */
function Roller() {
  return <div className="roller-bar" aria-hidden />;
}

/** 군령 두루마리: 모바일은 하단 시트, 넓은 화면은 지도 옆에 붙는다. */
function Briefing({
  stageId, title, desc, done, enemies, mine, dropId, dropName, noSquads, canFight, marchSec, fought, stageEnemies, onFight, onFormation, children,
}: {
  stageId: string; title: string; desc: string; done: boolean;
  enemies: UnitProfile[]; mine: UnitProfile[];
  dropId: string | null; dropName?: string; noSquads: boolean; canFight: boolean; marchSec: number; fought: boolean;
  stageEnemies: EnemyUnit[];
  onFight: () => void; onFormation: () => void; children?: ReactNode;
}) {
  const lead = enemies[0];
  const commander = stageEnemies[0]?.members[0];
  const leadName = commander ? GENERAL_MAP[commander]?.name ?? lead?.name : lead?.name;
  const troop = mainTroop(enemies);
  const grade = gradeLabel(mine, enemies);
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-h-[46dvh] w-[calc(100%-1.5rem)] max-w-lg flex-col lg:sticky lg:bottom-auto lg:top-20 lg:z-0 lg:mx-0 lg:max-h-[calc(100dvh-6rem)] lg:w-auto">
      <Roller />
      <div className="silk flex min-h-0 flex-1 flex-col">
        <div key={stageId} className="animate-slide-in min-h-0 flex-1 overflow-y-auto px-6 py-3">
          <div className="flex items-start gap-2.5">
            <span className="seal seal-lg shrink-0">軍令</span>
            <div className="min-w-0">
              <div className="font-serif text-lg font-black leading-tight">{stageId} {title}</div>
              <p className="mt-0.5 text-[11px] opacity-70">{desc}</p>
            </div>
          </div>

          <div className="ornate-rule"><i /></div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span>적 주장 <b className="font-serif">{leadName ?? '—'}</b></span>
            {troop && <span className="seal">{TROOP[troop].seal}</span>}
            <span className="opacity-70">{troop ? TROOP[troop].label : ''} {enemies.length}부대</span>
            <span className={cn('rounded px-1.5 py-0.5 font-bold ring-1',
              grade === '상성 유리' ? 'bg-[#276347]/15 text-[#276347] ring-[#276347]/40'
                : grade === '주의' ? 'bg-[#B8382E]/15 text-[#B8382E] ring-[#B8382E]/40'
                  : 'bg-[#8a6230]/15 text-[#8A6230] ring-[#8a6230]/40')}>
              {grade}
            </span>
          </div>

          {dropId && dropName && (
            <div className="frame frame-sm mt-2.5 flex items-center gap-2.5 p-2">
              <Corners size={14} />
              <GearArt id={dropId} size="sm" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#8A6230]">전리품</div>
                <div className="truncate font-serif text-sm font-bold">{dropName}</div>
              </div>
              {done && <span className="ml-auto text-[10px] opacity-60">재도전 시 가끔</span>}
            </div>
          )}

          {children}

          <div className="mt-3.5 mb-1">
            {!noSquads ? (
              <button type="button" className="btn-war disabled:opacity-50" disabled={!canFight} onClick={onFight}>
                <Swords size={18} /> {canFight ? `출정 (행군 ${marchSec}초)` : "출정 부대를 고르세요"}
              </button>
            ) : (
              <button type="button" className="btn-war btn-war-alt" onClick={onFormation}>편성하러 가기</button>
            )}
          </div>
          <CounterFormationButton enemies={stageEnemies} unlocked={fought} lockedNote="첫 전투 후 개방" className="mt-2 w-full" />
        </div>
      </div>
      <Roller />
    </div>
  );
}
