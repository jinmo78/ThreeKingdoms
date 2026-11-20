// 부대 편성 편집기 — 편성 화면 · 천하 토벌전 · 모의전에서 공용
// 넓은 화면: 칸을 고른 뒤 아래 목록에서 배치. 모바일: 빈 칸 + → 팝업에서 배치
// 목록에는 새로 켜지는 시너지와 주장 상성을 미리 표시
import { Coins, Plus, Save, Trash2, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BOND_MAP } from '../data/bonds';
import { GENERAL_MAP } from '../data/generals';
import { FACTION, FACTIONS, SLOT_LABEL, STAT_LABEL, TROOP, UNIT_TINT } from '../data/meta';
import { FORMATION_GOLD, PRESET_LIMIT, formationGold, unitGold } from '../engine/formationBook';
import { matchupGrade, matchupVs } from '../engine/matchup';
import { emptyUnit, unitProfile } from '../engine/profiles';
import { calcSynergy } from '../engine/synergy';
import { effectiveStats, shownRarity, type UnitProfile } from '../engine/unit';
import { useGame } from '../store/gameStore';
import { sanitizeFormation } from '../store/saveData';
import type { EnemyUnit, Faction, GeneralDef, OwnedGeneral, Slot, Troop, Unit } from '../types';
import { SLOTS } from '../types';
import { GearBag } from './GearPanel';
import { CounterFormationButton } from './CounterFormation';
import { GeneralDetail, GeneralToken, RarityBadge, Stars, SynergyList, UnitStats } from './General';
import { MatchupBadge } from './Matchup';
import { Btn, cn, Hint, Modal, NameSearch, useLandscape } from './ui';

type Target = { unit: number; slot: Slot };
type DetailState = { def: GeneralDef; from?: Target };

function unitDefs(u: Unit | undefined): (GeneralDef | null)[] {
  return SLOTS.map((s) => {
    const id = u?.[s];
    return id ? GENERAL_MAP[id] ?? null : null;
  });
}

/** 주장 중심의 좌우 대칭 진형. 데이터 순서는 바꾸지 않는다. */
const FORM_ROWS: Slot[][] = [
  ['vice1', 'commander', 'vice2'],
  ['aide1', 'strategist', 'aide2'],
];

const SLOT_FACE: Record<Slot, { icon: string; name: string }> = {
  commander: { icon: '👑', name: '주장' },
  vice1: { icon: '⚔️', name: '부장1' },
  vice2: { icon: '⚔️', name: '부장2' },
  strategist: { icon: '📜', name: '참모' },
  aide1: { icon: '🛡️', name: '보좌' },
  aide2: { icon: '🛡️', name: '보좌' },
};

/** 지금 켜진 시너지에 들어 있는 장수. 표시용이라 전투 계산은 그대로다. */
function glowingIds(members: (GeneralDef | null)[]): Set<string> {
  const glow = new Set<string>();
  const present = members.filter((m): m is GeneralDef => !!m);
  const byFaction = new Map<string, GeneralDef[]>();
  for (const g of present) {
    const list = byFaction.get(g.faction) ?? [];
    list.push(g);
    byFaction.set(g.faction, list);
  }
  for (const list of byFaction.values()) if (list.length >= 3) list.forEach((g) => glow.add(g.id));
  const commander = members[0];
  if (commander) {
    const same = present.filter((g) => g.troop === commander.troop);
    if (same.length >= 3) same.forEach((g) => glow.add(g.id));
  }
  const holders = new Map<string, Set<string>>();
  for (const g of present) {
    for (const bond of g.bonds) {
      if (!holders.has(bond)) holders.set(bond, new Set());
      holders.get(bond)!.add(g.id);
    }
  }
  for (const [bond, ids] of holders) {
    const def = BOND_MAP[bond];
    if (def && ids.size >= def.tiers[0].count) ids.forEach((id) => glow.add(id));
  }
  const strategist = members[3];
  if (strategist && strategist.stats.int >= 90) glow.add(strategist.id);
  return glow;
}

export function FormationEditor({ enemy, counter, unitGridClass = 'lg:grid-cols-3' }: {
  /** 상성 힌트 기준 적 부대 (없으면 상성 표시 생략) */
  enemy: UnitProfile[] | null;
  /** 있으면 이 적군에 맞춘 유료 편성 버튼을 자동 편성 옆에 둔다 */
  counter?: { enemies: EnemyUnit[]; unlocked: boolean; lockedNote?: string };
  unitGridClass?: string;
}) {
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const formation = useGame((s) => s.formation);
  const assign = useGame((s) => s.assign);
  const clearUnit = useGame((s) => s.clearUnit);
  const autoForm = useGame((s) => s.autoForm);
  const [autoNote, setAutoNote] = useState(false);
  const [target, setTarget] = useState<Target>({ unit: 0, slot: 'commander' });
  const [filter, setFilter] = useState<Faction | 'all'>('all');
  const [benchOnly, setBenchOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [info, setInfo] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const land = useLandscape();
  const [presetOpen, setPresetOpen] = useState(false);
  const enemyTroops = enemy?.map((e) => e.troop) ?? [];

  // 배치 위치 역참조: 장수 id → "1부대 주장"
  const placed = useMemo(() => {
    const m: Record<string, { unit: number; label: string }> = {};
    formation.forEach((u, i) => SLOTS.forEach((s) => { if (u[s]) m[u[s]!] = { unit: i, label: `${i + 1}부대 · ${SLOT_FACE[s].name}` }; }));
    return m;
  }, [formation]);

  const owned = useMemo(
    () =>
      Object.entries(roster)
        .flatMap(([id, o]) => {
          const def = GENERAL_MAP[id];
          return def ? [{ def, owned: o }] : [];
        })
        .filter((x) => filter === 'all' || x.def.faction === filter)
        .sort((a, b) => rarityRank(b.def) - rarityRank(a.def) || b.owned.level - a.owned.level),
    [roster, filter],
  );
  const needle = query.trim();
  const matched = needle ? owned.filter((x) => x.def.name.includes(needle)) : owned;
  const listed = benchOnly ? matched.filter((x) => !placed[x.def.id]) : matched;

  // 현재 선택 슬롯에 넣었을 때 새로 생기거나 강화되는 시너지
  const preview = useMemo(() => {
    const unit = formation[target.unit] ?? emptyUnit();
    const before = calcSynergy(unitDefs(unit));
    const beforeKeys = new Map(before.list.map((s) => [s.key, s.power + s.chain]));
    const out: Record<string, string[]> = {};
    for (const { def } of owned) {
      if (unit[target.slot] === def.id) continue;
      const trial: Unit = { ...unit };
      for (const s of SLOTS) if (trial[s] === def.id) trial[s] = null;
      trial[target.slot] = def.id;
      const after = calcSynergy(unitDefs(trial));
      const gains = after.list
        .filter((s) => (beforeKeys.get(s.key) ?? -1) < s.power + s.chain)
        .map((s) => s.label.replace(/ \([^)]*\)| ×\d/, ''));
      if (gains.length) out[def.id] = gains;
    }
    return out;
  }, [formation, target, owned]);

  function place(id: string) {
    assign(target.unit, target.slot, id);
    setPicker(false);
    // 같은 부대의 다음 빈 칸으로 자동 이동
    const nextUnit = { ...formation[target.unit] };
    for (const s of SLOTS) if (nextUnit[s] === id) nextUnit[s] = null;
    nextUnit[target.slot] = id;
    const empty = SLOTS.find((s) => !nextUnit[s]);
    if (empty) setTarget({ unit: target.unit, slot: empty });
  }

  function openSlot(unit: number, slot: Slot) {
    setTarget({ unit, slot });
    if (land || window.matchMedia('(max-width: 639px)').matches) setPicker(true);
  }

  return (
    <div className={land ? 'space-y-1.5' : 'space-y-3'}>
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="gold" size="sm" onClick={() => { autoForm(); setAutoNote(true); setTarget({ unit: 0, slot: 'commander' }); }}>
          <Wand2 size={14} /> 자동 편성 <span className="text-[10px] font-normal opacity-80">무료</span>
        </Btn>
        {counter && (
          <CounterFormationButton enemies={counter.enemies} unlocked={counter.unlocked} lockedNote={counter.lockedNote} size="sm" />
        )}
        {land && (
          <Btn variant="ghost" size="sm" onClick={() => setPresetOpen(true)}><Save size={14} /> 저장·불러오기</Btn>
        )}
        {autoNote && <span className="animate-slide-in text-[10px] font-bold text-amber-200/80">재편성</span>}
      </div>

      {!land && <PresetBar onLoaded={() => setTarget({ unit: 0, slot: 'commander' })} />}

      <div className={cn('grid', land ? 'grid-cols-3 gap-1.5' : cn('gap-3', unitGridClass))}>
        {formation.map((u, ui) => {
          if (!u) return null;
          const p = unitProfile(u, roster, gear);
          const members = unitDefs(u);
          const syn = p?.synergy ?? calcSynergy(members);
          const linkedIds = glowingIds(members);
          return (
            <section key={ui} className={cn('rounded-2xl border-2 transition-shadow', land ? 'min-w-0 p-1.5' : 'p-3', UNIT_TINT[ui].card,
              target.unit === ui && 'ring-2 ring-stone-100')}>
              <header className={cn('flex items-center justify-between gap-2', land ? 'mb-1' : 'mb-2')}>
                <h3 className={cn('min-w-0 truncate font-serif text-base font-black', UNIT_TINT[ui].title)}>
                  제{ui + 1}부대 {p && !land && <span className="ml-1 text-xs font-normal text-stone-400">{p.name}</span>}
                </h3>
                {land && p && (
                  <button type="button" onClick={() => setInfo(ui)} title="전투력 · 시너지"
                    className="tabular shrink-0 rounded-full bg-stone-950/60 px-1.5 py-0.5 text-[10px] font-bold text-stone-200">⚔ {Math.round(p.power).toLocaleString()}</button>
                )}
                {!land && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', UNIT_TINT[ui].chip)}>금 {unitGold(u, roster)}</span>}
                {p && enemy && <MatchupBadge troop={p.troop} enemyTroops={enemyTroops} className="ml-auto mr-2 shrink-0" />}
                {SLOTS.some((s) => u[s]) && (
                  <button type="button" onClick={() => clearUnit(ui)} className="text-stone-500 hover:text-red-300" title="부대 비우기"><Trash2 size={14} /></button>
                )}
              </header>

              <div className={land ? 'space-y-1' : 'space-y-2'}>
                {FORM_ROWS.map((row) => (
                <div key={row.join()} className={cn('grid grid-cols-3 items-stretch', land ? 'gap-1' : 'gap-2')}>
                {row.map((slot) => {
                  const id = u[slot];
                  const def = id ? GENERAL_MAP[id] ?? null : null;
                  const owned = id ? roster[id] : undefined;
                  const active = target.unit === ui && target.slot === slot;
                  const linked = !!def && linkedIds.has(def.id);
                  const badCommander = !!enemy && slot === 'commander' && def && matchupGrade(matchupVs(def.troop, enemyTroops)) === 'bad';
                  return (
                    <div key={slot} className={cn('relative flex flex-col items-center rounded-xl border-2', land ? 'gap-0.5 p-1' : 'min-h-24 gap-1 p-2',
                      slot === 'commander' ? 'border-solid border-[#C6A15B]' : 'border-dashed border-stone-700',
                      linked && 'synergy-glow',
                      active ? 'border-[#B8382E] bg-red-950/40' : badCommander ? 'border-solid border-[#B8382E] bg-stone-950/60' : 'bg-stone-950/60')}>
                      <span className="flex items-center gap-0.5">
                        <button type="button" onClick={() => (def ? setTarget({ unit: ui, slot }) : openSlot(ui, slot))}
                          className={cn('text-[10px] font-bold', slot === 'commander' ? 'text-amber-300' : 'text-stone-400')}>
                          {SLOT_FACE[slot].icon} {SLOT_FACE[slot].name}{active ? ' ·' : ''}
                        </button>
                        <Hint text={SLOT_LABEL[slot].hint} />
                      </span>
                      {def ? (
                        <button type="button" onClick={() => { setTarget({ unit: ui, slot }); setDetail({ def, from: { unit: ui, slot } }); }}
                          className="flex w-full flex-col items-center gap-1" title="상세 보기">
                          <GeneralToken def={def} rarity={shownRarity(def.rarity, owned?.promote)} size="fill" className={cn('w-full', land ? 'max-w-[38px]' : 'max-w-[84px]')} />
                          <span className="flex flex-wrap items-center justify-center gap-1">
                            <span className={cn('font-bold', land ? 'text-[10px]' : 'text-xs')}>{def.name}</span>
                            {!land && <RarityBadge rarity={shownRarity(def.rarity, owned?.promote)} />}
                          </span>
                        </button>
                      ) : (
                        <button type="button" onClick={() => openSlot(ui, slot)} className="flex w-full flex-col items-center gap-1">
                          <div className={cn('flex aspect-square w-full items-center justify-center rounded-xl bg-stone-800/60 text-stone-600', land ? 'max-w-[38px]' : 'max-w-[84px]')}><Plus size={20} /></div>
                        </button>
                      )}
                      {def && (
                        <button type="button" onClick={() => assign(ui, slot, null)}
                          className="absolute -right-1 -top-1 rounded-full bg-stone-700 p-0.5 text-stone-300 hover:bg-red-700" title="빼기">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
                </div>
                ))}
              </div>

              <button type="button" onClick={() => setInfo(ui)}
                className={cn('mt-2 w-full rounded-lg bg-stone-950/60 py-1.5 text-[11px] font-bold text-stone-300 sm:hidden', land && 'hidden')}>
                전투력·시너지
              </button>
              {!land && <div className="mt-3 hidden space-y-2 sm:block">
                {p && <UnitStats p={p} />}
                <SynergyList synergy={syn} empty="활성 시너지 없음 — 세력·병과·인연을 맞춰 보세요" />
              </div>}
            </section>
          );
        })}
      </div>

      <section className={cn('rounded-2xl border border-stone-800 bg-stone-900/60 p-3', land && 'hidden')}>
        <div className={cn('flex flex-wrap items-center gap-2', land ? 'mb-1.5' : 'mb-3')}>
          <span className="text-sm font-bold">
            {benchOnly ? '대기' : '전체'}
            <span className={cn('ml-2 rounded px-1.5 py-px text-[10px]', UNIT_TINT[target.unit].chip)}>{target.unit + 1}부대 · {SLOT_FACE[target.slot].name}</span>
          </span>
          <button type="button" onClick={() => setBenchOnly((v) => !v)}
            className={cn('rounded-md px-2 py-1 text-xs font-bold', benchOnly ? 'bg-amber-400 text-[#1c1612]' : 'bg-stone-800 text-stone-300')}>
            {benchOnly ? '대기' : '전체'}
          </button>
          <NameSearch value={query} onChange={setQuery} placeholder="장수 이름" />
          <div className="ml-auto flex gap-1">
            {(['all', ...FACTIONS] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={cn('rounded-md px-2 py-1 text-xs font-bold', filter === f ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-400')}>
                {f === 'all' ? '전체' : FACTION[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
          {listed.map(({ def, owned: o }) => {
            const rank = shownRarity(def.rarity, o.promote);
            return (
              <button key={def.id} type="button" onClick={() => setDetail({ def })}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-950/40 px-1.5 py-2 text-center">
                <GeneralToken def={def} rarity={rank} size="lg" />
                <span className="break-keep-all text-sm font-black leading-tight">{def.name}</span>
              </button>
            );
          })}
        </div>
        {listed.length === 0 && (
          <p className="py-6 text-center text-xs text-stone-500">
            없음
          </p>
        )}
      </section>

      {!land && (
        <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3">
          <h3 className="mb-2 font-serif text-base font-black">장비</h3>
          <GearBag />
        </section>
      )}

      {land && presetOpen && (
        <Modal wide onClose={() => setPresetOpen(false)}>
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h3 className="font-serif text-base font-black text-[#C6A15B]">편성 저장 · 불러오기</h3>
            <button type="button" onClick={() => setPresetOpen(false)} aria-label="닫기" className="rounded-lg p-1 text-stone-400 hover:bg-stone-800"><X size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PresetBar onLoaded={() => { setTarget({ unit: 0, slot: 'commander' }); setPresetOpen(false); }} />
          </div>
        </Modal>
      )}

      {picker && (
        <Modal wide onClose={() => setPicker(false)}>
          <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="font-serif text-lg font-black">
              <span className={UNIT_TINT[target.unit].title}>{target.unit + 1}부대 · {SLOT_FACE[target.slot].name}</span>
              <span className="mt-0.5 block text-sm font-normal text-stone-400">넣을 장수를 고르세요</span>
            </h3>
            <button type="button" onClick={() => setPicker(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100" aria-label="닫기"><X size={18} /></button>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <NameSearch value={query} onChange={setQuery} placeholder="장수 이름" />
            {(['all', ...FACTIONS] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={cn('rounded-md px-2 py-1 text-xs font-bold', filter === f ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-400')}>
                {f === 'all' ? '전체' : FACTION[f].label}
              </button>
            ))}
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto', land ? 'grid grid-cols-2 content-start gap-1.5' : 'space-y-1.5')}>
            {matched.map(({ def, owned: o }) => {
              const st = effectiveStats(def, o.level, o.stars, o.promote ?? 0);
              const rank = shownRarity(def.rarity, o.promote);
              const where = placed[def.id];
              const gains = preview[def.id];
              const cmdGrade = enemy && target.slot === 'commander' ? matchupGrade(matchupVs(def.troop, enemyTroops)) : null;
              return (
                <button key={def.id} type="button" onClick={() => place(def.id)}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl border p-2 text-left',
                    gains ? 'border-amber-400/40 bg-amber-400/5' : 'border-stone-800 bg-stone-950/40')}>
                  <GeneralToken def={def} rarity={rank} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1">
                      <span className="font-bold">{def.name}</span>
                      <RarityBadge rarity={rank} />
                      <span className="text-[11px] text-stone-500">Lv.{o.level}</span>
                      <Stars n={o.stars} />
                    </span>
                    <span className="tabular mt-0.5 block text-[11px] text-stone-400">
                      {STAT_LABEL.war} {st.war} · {STAT_LABEL.int} {st.int} · {STAT_LABEL.lead} {st.lead}
                    </span>
                    {(where || gains || (cmdGrade && cmdGrade !== 'even')) && (
                      <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        {where && <span className={cn('rounded px-1.5 py-px', UNIT_TINT[where.unit].chip)}>{where.label}</span>}
                        {cmdGrade === 'good' && <span className="font-bold text-emerald-300">{TROOP[def.troop].emoji} 상성 유리</span>}
                        {cmdGrade === 'bad' && <span className="font-bold text-red-300">{TROOP[def.troop].emoji} 상성 불리</span>}
                        {gains && <span className="text-amber-300">{gains.join(' · ')}</span>}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {matched.length === 0 && <p className="py-6 text-center text-xs text-stone-500">{needle ? '찾는 장수가 없습니다.' : '해당 세력의 장수가 없습니다.'}</p>}
          </div>
          </div>
        </Modal>
      )}

      {info !== null && (
        <Modal onClose={() => setInfo(null)}>
          <UnitInfo index={info} />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setInfo(null)}>닫기</Btn>
        </Modal>
      )}

      {detail && (
        <Modal ink wide onClose={() => setDetail(null)}>
          <CompareBoard
            detail={detail}
            owned={matched}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            placed={placed}
            preview={preview}
            enemyTroops={enemyTroops}
            target={target}
            onPick={(def) => setDetail({ def, from: detail.from })}
            onPlace={() => place(detail.def.id)}
            onRemove={() => assign(target.unit, target.slot, null)}
            onClose={() => setDetail(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function CompareBoard({
  detail, owned, query, setQuery, filter, setFilter, placed, preview, enemyTroops, target, onPick, onPlace, onRemove, onClose,
}: {
  detail: DetailState;
  owned: { def: GeneralDef; owned: OwnedGeneral }[];
  query: string;
  setQuery: (v: string) => void;
  filter: Faction | 'all';
  setFilter: (f: Faction | 'all') => void;
  placed: Record<string, { unit: number; label: string }>;
  preview: Record<string, string[]>;
  enemyTroops: Troop[];
  target: Target;
  onPick: (def: GeneralDef) => void;
  onPlace: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const roster = useGame((s) => s.roster);
  const formation = useGame((s) => s.formation);
  const slotId = formation[target.unit]?.[target.slot] ?? null;
  const sitting = slotId ? GENERAL_MAP[slotId] : null;
  const sittingOwned = slotId ? roster[slotId] : undefined;
  const viewedOwned = roster[detail.def.id];
  const here = slotId === detail.def.id;
  const viewedStats = effectiveStats(detail.def, viewedOwned?.level ?? 1, viewedOwned?.stars ?? 0, viewedOwned?.promote ?? 0);
  const sittingStats = sitting
    ? effectiveStats(sitting, sittingOwned?.level ?? 1, sittingOwned?.stars ?? 0, sittingOwned?.promote ?? 0)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg font-black">
            <span className={UNIT_TINT[target.unit].title}>{target.unit + 1}부대 · {SLOT_FACE[target.slot].name}</span>
            <span className="ml-2 text-sm font-normal text-stone-400">보유 장수와 비교</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-stone-500">목록에서 장수를 눌러 능력치를 비교한 뒤 이 칸에 배치합니다.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-100" aria-label="닫기"><X size={18} /></button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,13rem)_minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:grid-rows-1">
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <NameSearch value={query} onChange={setQuery} placeholder="장수 이름" />
            {(['all', ...FACTIONS] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={cn('rounded-md px-2 py-1 text-xs font-bold', filter === f ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-400')}>
                {f === 'all' ? '전체' : FACTION[f].label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5 pr-1">
            {owned.map(({ def, owned: o }) => {
              const st = effectiveStats(def, o.level, o.stars, o.promote ?? 0);
              const rank = shownRarity(def.rarity, o.promote);
              const where = placed[def.id];
              const selected = def.id === detail.def.id;
              const gains = preview[def.id];
              return (
                <button key={def.id} type="button" onClick={() => onPick(def)}
                  className={cn('flex w-full items-center gap-2 rounded-xl border p-2 text-left',
                    selected ? 'border-amber-400/70 bg-amber-400/10' : 'border-stone-800 bg-stone-950/40 hover:border-stone-600')}>
                  <GeneralToken def={def} rarity={rank} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate font-bold">{def.name}</span>
                      <RarityBadge rarity={rank} />
                      <span className="text-[10px] text-stone-500">Lv.{o.level}</span>
                    </span>
                    <span className="tabular mt-0.5 block text-[10px] text-stone-400">
                      무 {st.war} · 지 {st.int} · 통 {st.lead}
                    </span>
                    {(where || gains) && (
                      <span className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                        {where && <span className={cn('rounded px-1 py-px', UNIT_TINT[where.unit].chip)}>{where.label}</span>}
                        {gains && <span className="text-amber-300">{gains.join(' · ')}</span>}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {owned.length === 0 && <p className="py-6 text-center text-xs text-stone-500">{query.trim() ? '찾는 장수가 없습니다.' : '해당 세력의 장수가 없습니다.'}</p>}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          {sitting && sittingStats && !here && (
            <div className="mb-3 rounded-xl border border-stone-700 bg-stone-950/50 p-3 text-xs">
              <div className="mb-1 font-bold text-stone-300">이 칸의 {sitting.name}과 비교</div>
              <div className="flex flex-wrap gap-2 tabular">
                <Delta label="무력" next={viewedStats.war} prev={sittingStats.war} />
                <Delta label="지력" next={viewedStats.int} prev={sittingStats.int} />
                <Delta label="통솔" next={viewedStats.lead} prev={sittingStats.lead} />
              </div>
            </div>
          )}
          {here && <p className="mb-3 rounded-xl bg-stone-950/50 px-3 py-2 text-xs text-stone-400">이 장수가 이미 이 칸에 있습니다.</p>}
          {!sitting && enemyTroops.length > 0 && target.slot === 'commander' && (
            <p className="mb-3 text-[11px] text-stone-500">
              {matchupGrade(matchupVs(detail.def.troop, enemyTroops)) === 'good' && '주장으로 두면 병과 상성이 유리합니다.'}
              {matchupGrade(matchupVs(detail.def.troop, enemyTroops)) === 'bad' && '주장으로 두면 병과 상성이 불리합니다.'}
            </p>
          )}
          <GeneralDetail def={detail.def} owned={viewedOwned} />
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-t border-stone-800 pt-3">
        {here ? (
          <Btn variant="ghost" className="flex-1" onClick={onRemove}>이 칸에서 빼기</Btn>
        ) : (
          <Btn className="flex-1" onClick={onPlace}>
            배치
          </Btn>
        )}
        <Btn variant="ghost" onClick={onClose}>닫기</Btn>
      </div>
    </div>
  );
}

function Delta({ label, next, prev }: { label: string; next: number; prev: number }) {
  const d = next - prev;
  return (
    <span className={cn('rounded-lg bg-stone-900 px-2 py-1', d > 0 ? 'text-emerald-300' : d < 0 ? 'text-red-300' : 'text-stone-400')}>
      {label} {d > 0 ? `+${d}` : d}
    </span>
  );
}

function UnitInfo({ index }: { index: number }) {
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const u = formation[index];
  const gear = useGame((s) => s.gear);
  const p = unitProfile(u, roster, gear);
  const syn = p?.synergy ?? calcSynergy(unitDefs(u));
  return (
    <>
      <h3 className="mb-3 font-serif text-lg font-black">제{index + 1}부대 {p && <span className="text-sm font-normal text-stone-400">{p.name}</span>}</h3>
      {p && <UnitStats p={p} />}
      <div className="mt-3">
        <SynergyList synergy={syn} empty="활성 시너지 없음 — 세력·병과·인연을 맞춰 보세요" />
      </div>
    </>
  );
}

function PresetBar({ onLoaded }: { onLoaded: () => void }) {
  const gold = useGame((s) => s.gold);
  const presets = useGame((s) => s.presets);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const savePreset = useGame((s) => s.savePreset);
  const loadPreset = useGame((s) => s.loadPreset);
  const deletePreset = useGame((s) => s.deletePreset);
  const [name, setName] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const cost = formationGold(formation, roster);

  const save = () => {
    const label = name.trim() || `편성 ${presets.length + 1}`;
    const result = savePreset(label);
    if (result === 'ok') {
      setName('');
      setNote(`「${label}」을 저장했습니다. 금화 -${cost}`);
      return;
    }
    setNote(result === 'full' ? `저장은 ${PRESET_LIMIT}개까지입니다.`
      : result === 'empty' ? '배치된 장수가 없습니다.'
        : result === 'gold' ? '금화가 부족합니다.'
          : '이름을 확인해 주세요.');
  };

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-base font-black">편성 저장</h3>
        <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-300"><Coins size={12} /> {gold.toLocaleString('ko-KR')}</span>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
        불러오기 무료
        <Hint text={`저장 비용은 배치 등급만큼. R ${FORMATION_GOLD.R} · SR ${FORMATION_GOLD.SR} · SSR ${FORMATION_GOLD.SSR}. 이름은 비우면 편성 1부터.`} />
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={name}
          maxLength={12}
          placeholder={`편성 ${presets.length + 1}`}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm text-stone-100"
        />
        <Btn size="sm" disabled={cost === 0 || gold < cost || presets.length >= PRESET_LIMIT} onClick={save}>
          <Save size={14} /> 저장{cost > 0 ? ` 🪙-${cost}` : ''}
        </Btn>
      </div>
      {note && <p className="mt-2 text-[11px] text-amber-300">{note}</p>}
      <ul className="mt-3 space-y-2">
        {presets.map((preset) => {
          const units = sanitizeFormation(preset.units, roster);
          const canLoad = units.some((u) => SLOTS.some((s) => u[s]));
          const names = units.map((u) => (u.commander ? GENERAL_MAP[u.commander]?.name ?? '공석' : '공석')).join(' · ');
          return (
            <li key={preset.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-800 bg-stone-950/40 px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{preset.name}</span>
                  <span className="text-[10px] text-stone-500">금 {formationGold(units, roster)}</span>
                </div>
                <div className="truncate text-[11px] text-stone-500">{names}</div>
              </div>
              <Btn size="sm" variant="outline" disabled={!canLoad}
                onClick={() => {
                  const result = loadPreset(preset.id);
                  if (result === 'ok') {
                    onLoaded();
                    setNote(`「${preset.name}」을 불러왔습니다.`);
                    return;
                  }
                  setNote('불러올 장수가 없습니다.');
                }}>
                불러오기
              </Btn>
              {confirmId === preset.id ? (
                <Btn size="sm" variant="ghost" onClick={() => { deletePreset(preset.id); setConfirmId(null); setNote(`「${preset.name}」을 지웠습니다.`); }}>지우기</Btn>
              ) : (
                <Btn size="sm" variant="ghost" onClick={() => setConfirmId(preset.id)}>삭제</Btn>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function rarityRank(d: GeneralDef) {
  return d.rarity === 'SSR' ? 3 : d.rarity === 'SR' ? 2 : 1;
}
