// 부대 편성 — 핵심 덱 빌딩 화면
// 슬롯을 고른 뒤 아래 장수 목록에서 탭하면 배치. 배치하면 새로 켜지는 시너지를 목록에 미리 표시
import { Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BondTag, GeneralDetail, GeneralToken, RarityBadge, Stars, SynergyList, UnitStats } from '../components/General';
import { Btn, cn, Modal } from '../components/ui';
import { getGeneral } from '../data/generals';
import { FACTION, FACTIONS, SLOT_LABEL, STAT_LABEL } from '../data/meta';
import { calcSynergy } from '../engine/synergy';
import { effectiveStats } from '../engine/unit';
import { unitProfile, useGame } from '../store/gameStore';
import type { Faction, GeneralDef, Slot, Unit } from '../types';
import { SLOTS } from '../types';

type Target = { unit: number; slot: Slot };

function unitDefs(u: Unit): (GeneralDef | null)[] {
  return SLOTS.map((s) => (u[s] ? getGeneral(u[s]!) : null));
}

export default function Formation() {
  const roster = useGame((s) => s.roster);
  const formation = useGame((s) => s.formation);
  const assign = useGame((s) => s.assign);
  const clearUnit = useGame((s) => s.clearUnit);
  const autoForm = useGame((s) => s.autoForm);
  const [autoNote, setAutoNote] = useState(false);
  const [target, setTarget] = useState<Target>({ unit: 0, slot: 'commander' });
  const [filter, setFilter] = useState<Faction | 'all'>('all');
  const [detail, setDetail] = useState<GeneralDef | null>(null);

  // 배치 위치 역참조: 장수 id → "1부대 주장"
  const placed = useMemo(() => {
    const m: Record<string, string> = {};
    formation.forEach((u, i) => SLOTS.forEach((s) => { if (u[s]) m[u[s]!] = `${i + 1}부대 ${SLOT_LABEL[s].label}`; }));
    return m;
  }, [formation]);

  const owned = useMemo(
    () =>
      Object.entries(roster)
        .map(([id, o]) => ({ def: getGeneral(id), owned: o }))
        .filter((x) => filter === 'all' || x.def.faction === filter)
        .sort((a, b) => rarityRank(b.def) - rarityRank(a.def) || b.owned.level - a.owned.level),
    [roster, filter],
  );

  // 현재 선택 슬롯에 넣었을 때 새로 생기거나 강화되는 시너지
  const preview = useMemo(() => {
    const unit = formation[target.unit];
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
        .map((s) => s.label.replace(/ \(\d\/\d\)| ×\d/, ''));
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-black">부대 편성</h2>
          <p className="text-xs text-stone-500">
            칸을 고른 뒤 아래에서 장수를 탭하세요. 같은 <b className="text-sky-300">세력</b>·<b className="text-orange-300">병과</b>·
            <b className="text-amber-300">인연</b>을 맞추면 전투력과 <b className="text-red-300">연쇄 전법</b> 확률이 올라갑니다.
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            부대 6칸 — 주장(병과·주 전법) · 부장×2(연쇄 1·2단) · 참모(연쇄 3단, 발동률↑) · 보좌×2(능력 일부 + 시너지 인원)
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Btn variant="gold" onClick={() => { autoForm(); setAutoNote(true); setTarget({ unit: 0, slot: 'commander' }); }}>
            <Wand2 size={15} /> 자동 편성
          </Btn>
          {autoNote && <span className="animate-slide-in text-[10px] text-amber-200/80">시너지를 고려해 3부대를 다시 짰습니다</span>}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {formation.map((u, ui) => {
          const p = unitProfile(u, roster);
          const syn = p?.synergy ?? calcSynergy(unitDefs(u));
          return (
            <section key={ui} className={cn('rounded-2xl border bg-stone-900/70 p-3 transition-colors',
              target.unit === ui ? 'border-red-600/60' : 'border-stone-800')}>
              <header className="mb-2 flex items-center justify-between">
                <h3 className="font-serif text-base font-black">제{ui + 1}부대 {p && <span className="ml-1 text-xs font-normal text-stone-400">{p.name}</span>}</h3>
                {SLOTS.some((s) => u[s]) && (
                  <button type="button" onClick={() => clearUnit(ui)} className="text-stone-500 hover:text-red-300" title="부대 비우기"><Trash2 size={14} /></button>
                )}
              </header>

              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map((slot) => {
                  const id = u[slot];
                  const def = id ? getGeneral(id) : null;
                  const active = target.unit === ui && target.slot === slot;
                  return (
                    <div key={slot} className="relative">
                      <button type="button" onClick={() => setTarget({ unit: ui, slot })}
                        className={cn('flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed p-2 transition-colors',
                          active ? 'border-red-500 bg-red-950/40' : def ? 'border-transparent bg-stone-950/60' : 'border-stone-700 hover:border-stone-500')}>
                        <span className={cn('text-[10px] font-bold', slot === 'commander' ? 'text-amber-300' : 'text-stone-400')}>{SLOT_LABEL[slot].label}</span>
                        {def ? (
                          <>
                            <GeneralToken def={def} size="md" />
                            <span className="text-xs font-bold">{def.name}</span>
                          </>
                        ) : (
                          <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-800/60 text-stone-600"><Plus size={18} /></div>
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

              <div className="mt-3 space-y-2">
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
            const st = effectiveStats(def, o.level, o.stars);
            const where = placed[def.id];
            const gains = preview[def.id];
            return (
              <div key={def.id} className={cn('flex items-center gap-2.5 rounded-xl border p-2 transition-colors',
                gains ? 'border-amber-400/40 bg-amber-400/5' : 'border-stone-800 bg-stone-950/40')}>
                <button type="button" onClick={() => setDetail(def)} title="상세 보기"><GeneralToken def={def} size="md" /></button>
                <button type="button" onClick={() => place(def.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{def.name}</span>
                    <RarityBadge rarity={def.rarity} />
                    <span className="text-[11px] text-stone-500">Lv.{o.level}</span>
                    <Stars n={o.stars} />
                  </div>
                  <div className="tabular text-[11px] text-stone-400">
                    {STAT_LABEL.war} {st.war} · {STAT_LABEL.int} {st.int} · {STAT_LABEL.lead} {st.lead}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {def.bonds.map((b) => <BondTag key={b} id={b} />)}
                  </div>
                  {(where || gains) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                      {where && <span className="rounded bg-stone-700 px-1.5 py-px text-stone-200">{where}</span>}
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

function rarityRank(d: GeneralDef) {
  return d.rarity === 'SSR' ? 3 : d.rarity === 'SR' ? 2 : 1;
}
