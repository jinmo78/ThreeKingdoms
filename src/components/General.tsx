// 장수 토큰 · 카드 · 시너지 배지 등 장수 관련 UI
import { Flame, Link2, Sparkles, Star, Users } from 'lucide-react';
import { BOND_MAP } from '../data/bonds';
import { EFFECT_LABEL, FACTION, RARITY, STAT_LABEL, TROOP } from '../data/meta';
import type { ActiveSynergy, SynergyResult } from '../engine/synergy';
import { effectiveStats, expToNext, MAX_STARS, type UnitProfile } from '../engine/unit';
import type { GeneralDef, OwnedGeneral, StatKey } from '../types';
import { Bar, cn } from './ui';

const SIZE = {
  sm: { box: 'h-9 w-9 rounded-lg', char: 'text-base', troop: 'text-[10px] -bottom-1 -right-1' },
  md: { box: 'h-12 w-12 rounded-xl', char: 'text-xl', troop: 'text-xs -bottom-1 -right-1' },
  lg: { box: 'h-20 w-20 rounded-2xl', char: 'text-4xl', troop: 'text-base -bottom-1.5 -right-1.5' },
};

/** 인장(印章) 느낌의 장수 토큰: 세력 색 + 이름 첫 글자 + 병과 이모지 */
export function GeneralToken({ def, size = 'md', dim, className }: { def: GeneralDef; size?: keyof typeof SIZE; dim?: boolean; className?: string }) {
  const f = FACTION[def.faction];
  const s = SIZE[size];
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn('flex items-center justify-center border-2 font-serif font-black text-white', s.box, RARITY[def.rarity].border, dim && 'opacity-30 grayscale')}
        style={{ background: `linear-gradient(145deg, ${f.hex}, #1c1917 120%)` }}
      >
        <span className={cn(s.char, 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]')}>{def.name[0]}</span>
      </div>
      <span className={cn('absolute leading-none', s.troop)} aria-label={TROOP[def.troop].label}>{TROOP[def.troop].emoji}</span>
    </div>
  );
}

export function RarityBadge({ rarity, className }: { rarity: GeneralDef['rarity']; className?: string }) {
  return <span className={cn('rounded px-1.5 py-px text-[10px] font-black tracking-wider', RARITY[rarity].badge, className)}>{rarity}</span>;
}

export function FactionBadge({ faction }: { faction: GeneralDef['faction'] }) {
  const f = FACTION[faction];
  return <span className={cn('rounded px-1.5 py-px text-[10px] font-bold text-white', f.bg)}>{f.label}</span>;
}

export function Stars({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-px text-amber-300', className)}>
      {Array.from({ length: n }, (_, i) => <Star key={i} size={10} fill="currentColor" strokeWidth={0} />)}
    </span>
  );
}

export function BondTag({ id, active }: { id: string; active?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px]',
      active ? 'border-amber-400/60 bg-amber-400/15 text-amber-200' : 'border-stone-700 text-stone-400')}
    >
      <Link2 size={9} />{id}
    </span>
  );
}

/** 도감/등용 결과용 세로 카드 */
export function GeneralCard({
  def, owned, onClick, className, highlight,
}: {
  def: GeneralDef; owned?: OwnedGeneral; onClick?: () => void; className?: string; highlight?: boolean;
}) {
  const r = RARITY[def.rarity];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col items-center gap-1.5 overflow-hidden rounded-2xl border bg-stone-900 p-3 text-center transition-transform hover:-translate-y-0.5',
        r.border, highlight && r.glow, className,
      )}
    >
      {def.rarity === 'SSR' && (
        <div className="pointer-events-none absolute -inset-1/2 animate-spin-slow opacity-20"
          style={{ background: 'conic-gradient(from 0deg, transparent, #fbbf24, transparent 30%)' }} />
      )}
      <div className="relative flex w-full items-center justify-between">
        <RarityBadge rarity={def.rarity} />
        <FactionBadge faction={def.faction} />
      </div>
      <GeneralToken def={def} size="lg" dim={owned === undefined && !highlight} className="relative mt-1" />
      <div className="relative">
        <div className={cn('font-serif text-lg font-black', owned || highlight ? 'text-stone-100' : 'text-stone-500')}>{def.name}</div>
        <div className="text-[11px] text-stone-500">{def.title}</div>
      </div>
      <div className="relative flex h-4 items-center gap-1 text-[11px] text-stone-400">
        {owned ? <>Lv.{owned.level} <Stars n={owned.stars} /></> : !highlight && '미등용'}
      </div>
    </button>
  );
}

const SYN_ICON = { bond: Link2, faction: Users, troop: Flame, sage: Sparkles } as const;
const SYN_STYLE = {
  bond: 'border-amber-400/50 bg-amber-400/10 text-amber-200',
  faction: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  troop: 'border-orange-400/40 bg-orange-400/10 text-orange-200',
  sage: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
} as const;

export function SynergyBadge({ s }: { s: ActiveSynergy }) {
  const Icon = SYN_ICON[s.kind];
  return (
    <span className={cn('animate-slide-in inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold', SYN_STYLE[s.kind], s.maxed && 'ring-1 ring-amber-300/50')}>
      <Icon size={12} />
      <span>{s.label}</span>
      <span className="font-normal opacity-75">{s.detail}</span>
    </span>
  );
}

export function SynergyList({ synergy, empty }: { synergy: SynergyResult; empty?: string }) {
  if (synergy.list.length === 0) {
    return <p className="text-xs text-stone-500">{empty ?? '활성 시너지 없음'}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {synergy.list.map((s) => <SynergyBadge key={s.key} s={s} />)}
    </div>
  );
}

/** 부대 요약 수치 */
export function UnitStats({ p }: { p: UnitProfile }) {
  return (
    <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
      <Stat label="전투력" value={p.power.toLocaleString()} strong />
      <Stat label="병력" value={p.hp.toLocaleString()} />
      <Stat label="전법" value={`${Math.round(p.skillRate * 100)}%`} />
      <Stat label="연쇄" value={`${Math.round(p.synergy.chainRate * 100)}%`} accent />
    </div>
  );
}
function Stat({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-stone-950/60 px-1 py-1.5">
      <div className="text-stone-500">{label}</div>
      <div className={cn('tabular font-bold', strong ? 'text-amber-300' : accent ? 'text-red-300' : 'text-stone-200')}>{value}</div>
    </div>
  );
}

/** 장수 상세 (모달 내용) */
export function GeneralDetail({ def, owned }: { def: GeneralDef; owned?: OwnedGeneral }) {
  const level = owned?.level ?? 1;
  const stats = effectiveStats(def, level, owned?.stars ?? 0);
  const keys: StatKey[] = ['war', 'int', 'lead'];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <GeneralToken def={def} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <RarityBadge rarity={def.rarity} />
            <FactionBadge faction={def.faction} />
            <span className="text-xs text-stone-400">{TROOP[def.troop].emoji} {TROOP[def.troop].label}</span>
          </div>
          <div className="mt-1 font-serif text-2xl font-black">{def.name}</div>
          <div className="text-xs text-stone-500">{def.title}</div>
        </div>
      </div>

      {owned && (
        <div className="rounded-xl bg-stone-950/60 p-3 text-xs">
          <div className="mb-1 flex justify-between text-stone-400">
            <span>Lv.{owned.level} <Stars n={owned.stars} className="ml-1" /></span>
            <span className="tabular">EXP {owned.exp} / {expToNext(owned.level)}</span>
          </div>
          <Bar value={owned.exp} max={expToNext(owned.level)} color="bg-amber-400" />
          <div className="mt-1 text-[10px] text-stone-500">돌파 {owned.stars}/{MAX_STARS} · 중복 등용 시 능력치 +4%</div>
        </div>
      )}

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-3 text-xs">
            <span className="w-8 text-stone-400">{STAT_LABEL[k]}</span>
            <Bar value={stats[k]} max={180} className="flex-1" color={k === 'war' ? 'bg-red-500' : k === 'int' ? 'bg-sky-500' : 'bg-amber-500'} />
            <span className="tabular w-8 text-right font-bold">{stats[k]}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-3">
        <div className="flex items-center justify-between">
          <span className="font-serif text-base font-black text-red-200">【{def.skill.name}】</span>
          <span className="text-[10px] text-red-300/80">{EFFECT_LABEL[def.skill.effect]} · {STAT_LABEL[def.skill.scaling]} 기반 · 발동 {Math.round(def.skill.rate * 100)}%</span>
        </div>
        <p className="mt-1 text-xs text-stone-300">{def.skill.desc}</p>
        <p className="mt-1 text-[10px] text-stone-500">주장일 때 직접 발동, 부장·참모일 때는 연쇄 발동으로 이어집니다.</p>
      </div>

      {def.bonds.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-stone-400">인연</div>
          {def.bonds.map((b) => (
            <div key={b} className="flex items-start gap-2 text-xs">
              <BondTag id={b} active />
              <span className="text-stone-500">{BOND_MAP[b]?.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
