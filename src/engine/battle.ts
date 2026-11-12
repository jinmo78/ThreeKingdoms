// ============================================================
// 자동 전투 — 행동 게이지 방식
// ------------------------------------------------------------
// · 모든 부대의 게이지가 속도만큼 차오르고, 100에 닿은 부대가 행동
// · 행동: 주장 전법 발동(skillRate) 또는 일반 공격
// · 전법 발동 시 chainRate 확률로 부장 전법 "연쇄 발동!",
//   이어서 (chainRate × 0.6) 확률로 참모 전법 "연쇄 2단!"
// · 병과 상성 ×1.25 / ×0.8, 시너지 전투력 배율 적용
// · 결과는 시작 시점에 전부 계산되고 UI는 이벤트를 순서대로 재생
// ============================================================
import { troopMatchup } from '../data/meta';
import type { GeneralDef } from '../types';
import { mulberry32 } from './rng';
import type { UnitProfile } from './unit';

export type Side = 0 | 1;
export interface Ref {
  side: Side;
  idx: number;
}

export interface Hit extends Ref {
  amount: number;
  kind: 'dmg' | 'heal';
  matchup?: 'adv' | 'dis' | 'even';
}

export type EventKind = 'start' | 'attack' | 'skill' | 'chain' | 'rout' | 'end';

export interface BattleEvent {
  id: number;
  kind: EventKind;
  actor?: Ref;
  caster?: string;
  skill?: string;
  /** 1 = 연쇄 1단, 2 = 연쇄 2단 */
  chainStep?: number;
  hits: Hit[];
  text: string;
  /** 이벤트 직후 병력 [side][idx] */
  hp: number[][];
}

export interface BattleResult {
  win: boolean;
  reason: 'rout' | 'timeout';
  units: UnitProfile[][];
  events: BattleEvent[];
  stats: { skills: number; chains: number; maxChain: number };
}

interface Fighter extends Ref {
  p: UnitProfile;
  hp: number;
  gauge: number;
  routed: boolean;
}

const MAX_ACTIONS = 160;
const DMG_K = 3.2;
const HEAL_K = 2.2;
const CHAIN_MULT = [1, 0.8, 1.05];
const MATCHUP_MULT = { adv: 1.25, dis: 0.8, even: 1 } as const;

export function simulateBattle(player: UnitProfile[], enemy: UnitProfile[], seed: number): BattleResult {
  const rng = mulberry32(seed);
  const rand = (a: number, b: number) => a + (b - a) * rng();

  const fighters: Fighter[][] = [player, enemy].map((list, side) =>
    list.map((p, idx) => ({ side: side as Side, idx, p, hp: p.hp, gauge: rng() * 30, routed: false })),
  );
  const events: BattleEvent[] = [];
  const stats = { skills: 0, chains: 0, maxChain: 0 };

  const snapshot = () => fighters.map((s) => s.map((f) => Math.max(0, Math.round(f.hp))));
  const push = (e: Omit<BattleEvent, 'id' | 'hp'>) => events.push({ ...e, id: events.length, hp: snapshot() });
  const alive = (side: Side) => fighters[side].filter((f) => f.hp > 0);
  const ref = (f: Fighter): Ref => ({ side: f.side, idx: f.idx });

  /** 상성이 유리한 적을 조금 더 노림 */
  function pickTarget(f: Fighter): Fighter {
    const foes = alive((1 - f.side) as Side);
    const weights = foes.map((t) => (troopMatchup(f.p.troop, t.p.troop) === 'adv' ? 2 : 1));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < foes.length; i++) {
      r -= weights[i];
      if (r <= 0) return foes[i];
    }
    return foes[foes.length - 1];
  }

  function damage(f: Fighter, t: Fighter, raw: number, magical: boolean): Hit {
    const mitig = magical ? 100 / (100 + t.p.intel * 0.45) : 100 / (100 + t.p.def * 0.5);
    const matchup = troopMatchup(f.p.troop, t.p.troop);
    const amount = Math.max(1, Math.round(raw * mitig * MATCHUP_MULT[matchup] * rand(0.9, 1.1)));
    t.hp -= amount;
    return { ...ref(t), amount, kind: 'dmg', matchup };
  }

  function reportRouts(hits: Hit[]) {
    for (const h of hits) {
      const t = fighters[h.side][h.idx];
      if (h.kind === 'dmg' && t.hp <= 0 && !t.routed) {
        t.routed = true;
        push({ kind: 'rout', actor: ref(t), hits: [], text: `${t.p.name} 궤멸!` });
      }
    }
  }

  function castSkill(f: Fighter, g: GeneralDef, step: number) {
    const s = g.skill;
    const p = f.p;
    const base = s.scaling === 'war' ? p.atk : s.scaling === 'int' ? p.intel * 1.25 : p.def * 1.1;
    const mult = s.power * p.synergy.powerMult * CHAIN_MULT[step];
    const magical = s.scaling === 'int';
    const hits: Hit[] = [];

    if (s.effect === 'heal') {
      const allies = alive(f.side).sort((a, b) => a.hp / a.p.hp - b.hp / b.p.hp);
      const t = allies[0];
      const amount = Math.round(Math.min(t.p.hp - t.hp, base * HEAL_K * mult * rand(0.95, 1.05)));
      t.hp += amount;
      hits.push({ ...ref(t), amount, kind: 'heal' });
    } else if (s.effect === 'sweep') {
      for (const t of alive((1 - f.side) as Side)) hits.push(damage(f, t, base * DMG_K * mult, magical));
    } else {
      const t = pickTarget(f);
      hits.push(damage(f, t, base * DMG_K * mult, magical));
      if (s.effect === 'disrupt') t.gauge = Math.max(0, t.gauge - 60);
    }

    const prefix = step === 0 ? '' : step === 1 ? '⚡연쇄 발동! ' : '⚡⚡연쇄 2단! ';
    const summary = hits
      .map((h) => `${fighters[h.side][h.idx].p.name} ${h.kind === 'heal' ? '+' : '-'}${h.amount}`)
      .join(', ');
    push({
      kind: step === 0 ? 'skill' : 'chain',
      actor: ref(f),
      caster: g.name,
      skill: s.name,
      chainStep: step || undefined,
      hits,
      text: `${prefix}${g.name}의 전법 【${s.name}】 → ${summary}`,
    });
    reportRouts(hits);
  }

  function act(f: Fighter) {
    const p = f.p;
    if (rng() < p.skillRate) {
      stats.skills++;
      castSkill(f, p.members[0]!.def, 0);
      // 연쇄: 부장 → 참모
      let rate = p.synergy.chainRate;
      let step = 0;
      for (const m of [p.members[1], p.members[2]]) {
        if (!m || alive((1 - f.side) as Side).length === 0) break;
        if (rng() >= rate) break;
        step++;
        stats.chains++;
        castSkill(f, m.def, step);
        rate *= 0.6;
      }
      stats.maxChain = Math.max(stats.maxChain, step);
    } else {
      const t = pickTarget(f);
      const hit = damage(f, t, p.atk * DMG_K * p.synergy.powerMult, false);
      const tag = hit.matchup === 'adv' ? ' (상성 우위)' : hit.matchup === 'dis' ? ' (상성 열세)' : '';
      push({ kind: 'attack', actor: ref(f), hits: [hit], text: `${p.name}의 공격 → ${t.p.name} -${hit.amount}${tag}` });
      reportRouts([hit]);
    }
  }

  push({ kind: 'start', hits: [], text: `전투 개시! 아군 ${player.length}개 부대 vs 적군 ${enemy.length}개 부대` });

  let actions = 0;
  while (actions < MAX_ACTIONS && alive(0).length > 0 && alive(1).length > 0) {
    const all = [...alive(0), ...alive(1)];
    let next = all[0];
    let best = Infinity;
    for (const f of all) {
      const need = (100 - f.gauge) / f.p.speed;
      if (need < best) {
        best = need;
        next = f;
      }
    }
    for (const f of all) f.gauge += Math.max(0, best) * f.p.speed;
    next.gauge = Math.max(0, next.gauge - 100);
    act(next);
    actions++;
  }

  let win: boolean;
  let reason: BattleResult['reason'] = 'rout';
  if (alive(1).length === 0) win = true;
  else if (alive(0).length === 0) win = false;
  else {
    // 시간 초과: 남은 병력 비율로 판정
    reason = 'timeout';
    const ratio = (side: Side) =>
      fighters[side].reduce((s, f) => s + Math.max(0, f.hp), 0) / fighters[side].reduce((s, f) => s + f.p.hp, 0);
    win = ratio(0) > ratio(1);
  }
  push({
    kind: 'end',
    hits: [],
    text: win
      ? reason === 'rout' ? '승리! 적군을 모두 격파했다.' : '시간 초과 — 남은 병력 우세로 승리!'
      : reason === 'rout' ? '패배… 아군이 모두 궤멸했다.' : '시간 초과 — 남은 병력 열세로 퇴각…',
  });

  return { win, reason, units: [player, enemy], events, stats };
}
