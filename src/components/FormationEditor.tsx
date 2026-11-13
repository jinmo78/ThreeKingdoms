// 부대 편성 편집기 — 편성 화면 · 천하 토벌전 · 모의전에서 공용
// 칸을 고른 뒤 장수 목록에서 탭하면 배치. 배치하면 새로 켜지는 시너지와 주장 상성을 목록에 미리 표시
import { Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GENERAL_MAP } from '../data/generals';
import { FACTION, FACTIONS, SLOT_LABEL, STAT_LABEL, TROOP } from '../data/meta';
import { matchupGrade, matchupVs } from '../engine/matchup';
import { emptyUnit, unitProfile } from '../engine/profiles';
import { calcSynergy } from '../engine/synergy';
import { effectiveStats, shownRarity, type UnitProfile } from '../engine/unit';
import { useGame } from '../store/gameStore';
import type { Faction, GeneralDef, Slot, Unit } from '../types';
import { SLOTS } from '../types';
import { BondTag, GeneralDetail, GeneralToken, RarityBadge, Stars, SynergyList, UnitStats } from './General';
import { MatchupBadge } from './Matchup';
import { Btn, cn, Modal } from './ui';

type Target = { unit: number; slot: Slot };

function unitDefs(u: Unit | undefined): (GeneralDef | null)[] {
  return SLOTS.map((s) => {
    const id = u?.[s];
    return id ? GENERAL_MAP[id] ?? null : null;
  });
}

export function FormationEditor({ enemy, unitGridClass = 'lg:grid-cols-3' }: {
  /** 상성 힌트 기준 적 부대 (없으면 상성 표시 생략) */
  enemy: UnitProfile[] | null;
  unitGridClass?: string;
}) {
  const roster = useGame((s) => s.roster);
  const formation = useGame((s) => s.formation);
  const assign = useGame((s) => s.assign);
  const clearUnit = useGame((s) => s.clearUnit);
  const autoForm = useGame((s) => s.autoForm);
  const [autoNote, setAutoNote] = useState(false);
  const [target, setTarget] = useState<Target>({ unit: 0, slot: 'commander' });
  const [filter, setFilter] = useState<Faction | 'all'>('all');
  const [detail, setDetail] = useState<GeneralDef | null>(null);
  const [info, setInfo] = useState<number | null>(null);
  const enemyTroops = enemy?.map((e) => e.troop) ?? [];

  // 배치 위치 역참조: 장수 id → "1부대 주장"
  const placed = useMemo(() => {
    const m: Record<string, string> = {};
    formation.forEach((u, i) => SLOTS.forEach((s) => { if (u[s]) m[u[s]!] = `${i + 1}부대 ${SLOT_LABEL[s].label}`; }));
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
    // 같은 부대의 다음 빈 칸으로 자동 이동
    const nextUnit = { ...formation[target.unit] };
    for (const s of SLOTS) if (nextUnit[s] === id) nextUnit[s] = null;
    nextUnit[target.slot] = id;
    const empty = SLOTS.find((s) => !nextUnit[s]);
    if (empty) setTarget({ unit: target.unit, slot: empty });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="gold" size="sm" onClick={() => { autoForm(); setAutoNote(true); setTarget({ unit: 0, slot: 'commander' }); }}>
          <Wand2 size={14} /> 자동 편성
        </Btn>
        {autoNote && <span className="animate-slide-in text-[10px] text-amber-200/80">시너지를 고려해 3부대를 다시 짰습니다 (적 상성은 미반영)</span>}
      </div>

      <div className={cn('grid gap-3', unitGridClass)}>
        {formation.map((u, ui) => {
          if (!u) return null;
          const p = unitProfile(u, roster);
          const syn = p?.synergy ?? calcSynergy(unitDefs(u));
          return (
            <section key={ui} className={cn('rounded-2xl border bg-stone-900/70 p-3 transition-colors',
              target.unit === ui ? 'border-red-600/60' : 'border-stone-800')}>
              <header className="mb-2 flex items-center justify-between">
                <h3 className="min-w-0 truncate font-serif text-base font-black">제{ui + 1}부대 {p && <span className="ml-1 text-xs font-normal text-stone-400">{p.name}</span>}</h3>
                {p && enemy && <MatchupBadge troop={p.troop} enemyTroops={enemyTroops} className="ml-auto mr-2 shrink-0" />}
                {SLOTS.some((s) => u[s]) && (
                  <button type="button" onClick={() => clearUnit(ui)} className="text-stone-500 hover:text-red-300" title="부대 비우기"><Trash2 size={14} /></button>
                )}
              </header>

              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map((slot) => {
                  const id = u[slot];
                  const def = id ? GENERAL_MAP[id] ?? null : null;
                  const owned = id ? roster[id] : undefined;
                  const active = target.unit === ui && target.slot === slot;
                  const badCommander = !!enemy && slot === 'commander' && def && matchupGrade(matchupVs(def.troop, enemyTroops)) === 'bad';
                  return (
                    <div key={slot} className="relative">
                      <button type="button" onClick={() => setTarget({ unit: ui, slot })}
                        className={cn('flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed p-2 transition-colors',
                          active ? 'border-red-500 bg-red-950/40' : badCommander ? 'border-solid border-red-500/50 bg-stone-950/60' : def ? 'border-transparent bg-stone-950/60' : 'border-stone-700 hover:border-stone-500')}>
                        <span className={cn('text-[10px] font-bold', slot === 'commander' ? 'text-amber-300' : 'text-stone-400')}>{SLOT_LABEL[slot].label}</span>
                        {def ? (
                          <>
                            <GeneralToken def={def} rarity={shownRarity(def.rarity, owned?.promote)} size="fill" className="w-full max-w-[84px]" />
                            <span className="text-xs font-bold">{def.name}</span>
                            {badCommander && <span className="text-[9px] font-bold text-red-300">⚠ 상성 열세</span>}
                          </>
                        ) : (
                          <>
                            <div className="flex aspect-square w-full max-w-[84px] items-center justify-center rounded-xl bg-stone-800/60 text-stone-600"><Plus size={20} /></div>
                            <span className="text-[10px] text-stone-600">{SLOT_LABEL[slot].hint}</span>
                          </>
                        )}
                      </button>
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

              <button type="button" onClick={() => setInfo(ui)}
                className="mt-2 w-full rounded-lg bg-stone-950/60 py-1.5 text-[11px] font-bold text-stone-300 sm:hidden">
                전투력·시너지
              </button>
              <div className="mt-3 hidden space-y-2 sm:block">
                {p ? <UnitStats p={p} /> : <p className="rounded-lg bg-stone-950/50 py-2 text-center text-xs text-stone-500">주장을 배치해야 출진할 수 있습니다</p>}
                <SynergyList synergy={syn} empty="활성 시너지 없음 — 세력·병과·인연을 맞춰 보세요" />
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">
            <span className="text-red-300">제{target.unit + 1}부대 {SLOT_LABEL[target.slot].label}</span>에 배치할 장수
          </span>
          <div className="ml-auto flex gap-1">
            {(['all', ...FACTIONS] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={cn('rounded-md px-2 py-1 text-xs font-bold', filter === f ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-400')}>
                {f === 'all' ? '전체' : FACTION[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {owned.map(({ def, owned: o }) => {
            const st = effectiveStats(def, o.level, o.stars, o.promote ?? 0);
            const rank = shownRarity(def.rarity, o.promote);
            const where = placed[def.id];
            const gains = preview[def.id];
            const cmdGrade = enemy && target.slot === 'commander' ? matchupGrade(matchupVs(def.troop, enemyTroops)) : null;
            return (
              <div key={def.id} className={cn('flex items-center gap-2.5 rounded-xl border p-2 transition-colors',
                gains ? 'border-amber-400/40 bg-amber-400/5' : 'border-stone-800 bg-stone-950/40')}>
                <button type="button" onClick={() => setDetail(def)} title="상세 보기"><GeneralToken def={def} rarity={rank} size="md" /></button>
                <button type="button" onClick={() => place(def.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{def.name}</span>
                    <RarityBadge rarity={rank} />
                    <span className="text-[11px] text-stone-500">Lv.{o.level}</span>
                    <Stars n={o.stars} />
                  </div>
                  <div className="tabular hidden text-[11px] text-stone-400 sm:block">
                    {STAT_LABEL.war} {st.war} · {STAT_LABEL.int} {st.int} · {STAT_LABEL.lead} {st.lead}
                  </div>
                  <div className="mt-0.5 hidden flex-wrap gap-1 sm:flex">
                    {def.bonds.map((b) => <BondTag key={b} id={b} />)}
                  </div>
                  {(where || gains || (cmdGrade && cmdGrade !== 'even')) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                      {where && <span className="rounded bg-stone-700 px-1.5 py-px text-stone-200">{where}</span>}
                      {cmdGrade === 'good' && <span className="rounded bg-emerald-500/15 px-1.5 py-px font-bold text-emerald-300">{TROOP[def.troop].emoji} 주장 상성 유리</span>}
                      {cmdGrade === 'bad' && <span className="rounded bg-red-500/15 px-1.5 py-px font-bold text-red-300">{TROOP[def.troop].emoji} 주장 상성 불리</span>}
                      {gains && <span className="flex items-center gap-0.5 text-amber-300"><Sparkles size={10} /> {gains.join(' · ')}</span>}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {owned.length === 0 && <p className="py-6 text-center text-xs text-stone-500">해당 세력의 장수가 없습니다.</p>}
      </section>

      {info !== null && (
        <Modal onClose={() => setInfo(null)}>
          <UnitInfo index={info} />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setInfo(null)}>닫기</Btn>
        </Modal>
      )}

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <GeneralDetail def={detail} owned={roster[detail.id]} />
          <div className="mt-4 flex gap-2">
            <Btn className="flex-1" onClick={() => { place(detail.id); setDetail(null); }}>
              제{target.unit + 1}부대 {SLOT_LABEL[target.slot].label}로 배치
            </Btn>
            <Btn variant="ghost" onClick={() => setDetail(null)}>닫기</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function UnitInfo({ index }: { index: number }) {
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const u = formation[index];
  const p = unitProfile(u, roster);
  const syn = p?.synergy ?? calcSynergy(unitDefs(u));
  return (
    <>
      <h3 className="mb-3 font-serif text-lg font-black">제{index + 1}부대 {p && <span className="text-sm font-normal text-stone-400">{p.name}</span>}</h3>
      {p ? <UnitStats p={p} /> : <p className="rounded-lg bg-stone-950/50 py-2 text-center text-xs text-stone-500">주장을 배치해야 출진할 수 있습니다</p>}
      <div className="mt-3">
        <SynergyList synergy={syn} empty="활성 시너지 없음 — 세력·병과·인연을 맞춰 보세요" />
      </div>
    </>
  );
}

function rarityRank(d: GeneralDef) {
  return d.rarity === 'SSR' ? 3 : d.rarity === 'SR' ? 2 : 1;
}
