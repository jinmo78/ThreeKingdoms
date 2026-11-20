// 장비 가방. 레벨·강화·등급은 파편과 금화로 올리고, 장수 한 명에게만 끼운다.
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { GEAR, GEAR_MAP, GEAR_SLOT_LABEL } from '../data/gear';
import { RARITY, STAT_LABEL } from '../data/meta';
import { GENERAL_MAP } from '../data/generals';
import {
  GEAR_COPY_MAX, GEAR_MAX_ENHANCE, GEAR_MAX_LEVEL, GEAR_PROMOTE_SHARDS,
  gearBonus, gearCount, gearEnhanceCost, gearLevelCost, gearPromoteCost, gearPromoteLeft, gearRarity, gearSkill, wearersOf,
} from '../engine/gear';
import { useGame } from '../store/gameStore';
import type { GearSlot, Stats } from '../types';
import { GearArt } from './GearArt';
import { cn, Hint, HSlide, NameSearch } from './ui';

const SLOT_ORDER: GearSlot[] = ['weapon', 'armor', 'tome'];
const SLOT_MARK: Record<GearSlot, string> = { weapon: '劍', armor: '甲', tome: '書' };

/** 무기=무력, 갑주=통솔, 서책=지력. 장수의 가장 높은 능력 칸을 추천한다. */
const SLOT_FIT: Record<GearSlot, { stat: keyof Stats; gear: string; who: string }> = {
  weapon: { stat: 'war', gear: '무기', who: '무력이 높은 장수' },
  armor: { stat: 'lead', gear: '갑주', who: '통솔이 높은 장수' },
  tome: { stat: 'int', gear: '서책', who: '지력이 높은 장수' },
};

function recommendedSlots(stats: Stats): GearSlot[] {
  const top = Math.max(stats.war, stats.lead, stats.int);
  return SLOT_ORDER.filter((slot) => stats[SLOT_FIT[slot].stat] === top);
}

export function GearBag() {
  const bag = useGame((s) => s.gear);
  const roster = useGame((s) => s.roster);
  const gold = useGame((s) => s.gold);
  const equipGear = useGame((s) => s.equipGear);
  const unequipGear = useGame((s) => s.unequipGear);
  const gearLevelUp = useGame((s) => s.gearLevelUp);
  const gearEnhance = useGame((s) => s.gearEnhance);
  const gearPromote = useGame((s) => s.gearPromote);
  const [own, setOwn] = useState<'all' | 'owned' | 'missing'>('all');
  const [slotFilter, setSlotFilter] = useState<GearSlot | 'all'>('all');
  const [query, setQuery] = useState('');
  const ownedCount = GEAR.filter((g) => bag[g.id]).length;
  const needle = query.trim();
  const generals = Object.keys(roster).flatMap((id) => {
    const def = GENERAL_MAP[id];
    return def ? [{ id, name: def.name }] : [];
  });

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1 text-[11px] font-bold text-stone-400">
        {ownedCount}/{GEAR.length}
        <Hint text={`같은 장비 ${GEAR_COPY_MAX}개. 무기·갑주·서책 동시 장착. 레벨 파편 1, 강화 파편 2, 등급은 Lv.${GEAR_MAX_LEVEL}·+${GEAR_MAX_ENHANCE}에서 파편 ${GEAR_PROMOTE_SHARDS}.`} />
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <NameSearch value={query} onChange={setQuery} placeholder="장비 이름" />
        {([['all', '전체'], ['owned', '획득'], ['missing', '미획득']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setOwn(id)}
            className={cn('rounded-md px-2 py-1 text-xs font-bold', own === id ? 'bg-amber-400 text-[#1c1612]' : 'bg-stone-800 text-stone-300')}>
            {label}
          </button>
        ))}
        {(['all', ...SLOT_ORDER] as const).map((slot) => (
          <button key={slot} type="button" onClick={() => setSlotFilter(slot)}
            className={cn('rounded-md px-2 py-1 text-xs font-bold', slotFilter === slot ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-stone-400')}>
            {slot === 'all' ? '모든 칸' : GEAR_SLOT_LABEL[slot]}
          </button>
        ))}
      </div>
      {SLOT_ORDER.map((slot) => {
        const list = GEAR.filter((g) => {
          if (g.slot !== slot || (slotFilter !== 'all' && slot !== slotFilter)) return false;
          const has = !!bag[g.id];
          if (own === 'owned' && !has) return false;
          if (own === 'missing' && has) return false;
          return !needle || g.name.includes(needle);
        });
        if (list.length === 0) return null;
        return (
          <section key={slot}>
            <h3 className="mb-2 text-sm font-black text-stone-300">{GEAR_SLOT_LABEL[slot]}</h3>
            <HSlide>
              {list.map((def) => {
                const item = bag[def.id];
                if (!item) {
                  return (
                    <div key={def.id} className="flex gap-2 rounded-xl border border-dashed border-stone-700 bg-stone-950/40 p-3">
                      <GearArt id={def.id} dim />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 font-bold text-stone-400">{def.name} <Hint text={`${def.desc} ${SLOT_FIT[def.slot].who}`} /></div>
                        <div className="mt-1 text-[11px] text-stone-600">미획득</div>
                      </div>
                    </div>
                  );
                }
                const rank = gearRarity(def, item.promote);
                const bonus = gearBonus(def, item);
                const skill = gearSkill(def, item);
                const copies = gearCount(item);
                const wornBy = wearersOf(roster, def.id);
                const nextRank = gearPromoteLeft(def, item.promote) > 0 ? gearRarity(def, item.promote + 1) : null;
                const levelCost = gearLevelCost(item.level);
                const enhanceCost = gearEnhanceCost(item.enhance);
                const promoteCost = nextRank === 'SR' || nextRank === 'SSR' ? gearPromoteCost(nextRank) : 0;
                const ready = item.level >= GEAR_MAX_LEVEL && item.enhance >= GEAR_MAX_ENHANCE;
                return (
                  <div key={def.id} className={cn('rounded-xl border p-3', RARITY[rank].border, 'bg-stone-900/70')}>
                    <div className="flex items-center gap-2">
                      <GearArt id={def.id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('rounded px-1 py-0.5 text-[10px] font-black', RARITY[rank].badge)}>{rank}</span>
                          <span className="font-bold">{def.name}</span>
                          <Hint text={`${def.desc} ${SLOT_FIT[def.slot].who}`} />
                          <span className="ml-auto text-right text-xs font-bold text-amber-300">{effectLabel(def.stat, bonus, skill)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-stone-400">
                      보유 {copies} · 장착 {wornBy.length}/{copies} · Lv.{item.level}/{GEAR_MAX_LEVEL} · 강화 +{item.enhance} · 파편 {item.shards}
                    </div>
                    {wornBy.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {wornBy.map((id) => (
                          <button key={id} type="button" onClick={() => unequipGear(id, def.id)}
                            className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-200">
                            {GENERAL_MAP[id]?.name ?? id} 해제
                          </button>
                        ))}
                      </div>
                    )}
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-stone-400">
                      장착
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) equipGear(e.target.value, def.id); }}
                        className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-200"
                      >
                        <option value="">{wornBy.length >= copies ? '빈 개수 없음 · 옮길 장수' : '끼울 장수'}</option>
                        {generals.filter((g) => !wornBy.includes(g.id)).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <GrowBtn
                        label="레벨업"
                        disabled={item.level >= GEAR_MAX_LEVEL || item.shards < 1 || gold < levelCost}
                        onClick={() => gearLevelUp(def.id)}
                        note={item.level >= GEAR_MAX_LEVEL ? '최대' : `파편 1 · 금 ${levelCost}`}
                      />
                      <GrowBtn
                        label="강화"
                        disabled={item.enhance >= GEAR_MAX_ENHANCE || item.shards < 2 || gold < enhanceCost}
                        onClick={() => gearEnhance(def.id)}
                        note={item.enhance >= GEAR_MAX_ENHANCE ? '최대' : `파편 2 · 금 ${enhanceCost}`}
                      />
                      {nextRank && (
                        <GrowBtn
                          label={`${nextRank} 등급`}
                          disabled={!ready || item.shards < GEAR_PROMOTE_SHARDS || gold < promoteCost}
                          onClick={() => gearPromote(def.id)}
                          note={ready ? `파편 ${GEAR_PROMOTE_SHARDS} · 금 ${promoteCost}` : `Lv.${GEAR_MAX_LEVEL} · +${GEAR_MAX_ENHANCE} 필요`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </HSlide>
          </section>
        );
      })}
      {SLOT_ORDER.every((slot) => GEAR.filter((g) => {
        if (g.slot !== slot || (slotFilter !== 'all' && slot !== slotFilter)) return false;
        const has = !!bag[g.id];
        if (own === 'owned' && !has) return false;
        if (own === 'missing' && has) return false;
        return !needle || g.name.includes(needle);
      }).length === 0) && (
        <p className="py-6 text-center text-xs text-stone-500">없음</p>
      )}
    </div>
  );
}

function effectLabel(stat: keyof Stats, bonus: number, skill: { power: number; rate: number }) {
  const bits = [`${STAT_LABEL[stat]} +${bonus}`];
  if (skill.power) bits.push(`전법 위력 +${Math.round(skill.power * 100)}%`);
  if (skill.rate) bits.push(`전법 발동 +${Math.round(skill.rate * 100)}%`);
  return bits.join(' · ');
}

function GrowBtn({ label, note, disabled, onClick }: { label: string; note: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-stone-800 px-2 py-1 text-left text-[11px] font-bold text-stone-100 disabled:opacity-40"
    >
      {label}
      <span className="mt-0.5 block font-normal text-stone-400">{note}</span>
    </button>
  );
}

/** 장수 상세에서 칸마다 장비를 고른다. 성장은 편성 화면의 장비에서 한다. */
export function EquippedGear({ generalId }: { generalId: string }) {
  const roster = useGame((s) => s.roster);
  const bag = useGame((s) => s.gear);
  const equipGear = useGame((s) => s.equipGear);
  const unequipGear = useGame((s) => s.unequipGear);
  const [open, setOpen] = useState<GearSlot | null>(null);
  const owned = roster[generalId];
  const general = GENERAL_MAP[generalId];
  if (!owned || !general) return null;
  const best = recommendedSlots(general.stats);
  const advice = best.map((slot) => SLOT_FIT[slot].gear).join(' · ');
  const ownedIds = Object.keys(bag);
  const openSlot = open;
  const choices = openSlot ? ownedIds.filter((id) => GEAR_MAP[id]?.slot === openSlot) : [];
  const currentOpen = openSlot ? owned.gear?.[openSlot] ?? '' : '';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-serif text-sm font-bold">장비</div>
        <p className="text-right text-[10px] leading-relaxed text-stone-500">{advice}</p>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {SLOT_ORDER.map((slot) => {
          const current = owned.gear?.[slot] ?? '';
          const worn = current ? GEAR_MAP[current] : undefined;
          const wornItem = current ? bag[current] : undefined;
          const rank = worn && wornItem ? gearRarity(worn, wornItem.promote) : null;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => setOpen((cur) => cur === slot ? null : slot)}
              className={cn(
                'relative flex min-h-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-1 py-2 text-center',
                worn && rank ? cn('border-2 bg-stone-950/50', RARITY[rank].border) : 'border-dashed border-[#C6A15B]/55 bg-stone-950/30',
                open === slot && 'ring-2 ring-[#B8382E]',
              )}
            >
              {!worn && (
                <span aria-hidden className="pointer-events-none absolute text-4xl font-serif text-[#C6A15B]/25">{SLOT_MARK[slot]}</span>
              )}
              <span className="relative text-[10px] font-bold text-stone-500">
                {GEAR_SLOT_LABEL[slot]}
                {best.includes(slot) && <span className="ml-1 text-[#8C6B2F] dark:text-[#C6A15B]">추천</span>}
              </span>
              {worn && wornItem ? (
                <>
                  <GearArt id={worn.id} size="sm" />
                  <span className="relative text-[11px] font-bold leading-tight">{worn.name}</span>
                  <span className="relative text-[10px] leading-tight text-[#8C6B2F] dark:text-[#C6A15B]">{effectLabel(worn.stat, gearBonus(worn, wornItem), gearSkill(worn, wornItem))}</span>
                </>
              ) : (
                <span className="relative flex items-center gap-0.5 text-xs text-stone-500"><Plus size={14} /> 장착</span>
              )}
            </button>
          );
        })}
      </div>
      {openSlot && (
        <div className="mt-2 space-y-1 rounded-xl border border-[#C6A15B]/40 p-2">
          <div className="text-[11px] font-bold">{GEAR_SLOT_LABEL[openSlot]} 고르기</div>
          {currentOpen && (
            <button type="button" onClick={() => { unequipGear(generalId, currentOpen); setOpen(null); }}
              className="min-h-11 w-full rounded-lg border border-stone-600 px-2 text-left text-xs">
              해제
            </button>
          )}
          {choices.length === 0 && <p className="py-2 text-center text-[11px] text-stone-500">가진 장비가 없습니다.</p>}
          {choices.map((id) => {
            const piece = GEAR_MAP[id];
            const item = bag[id];
            const others = wearersOf(roster, id).filter((gid) => gid !== generalId).length;
            return (
              <button key={id} type="button" onClick={() => { equipGear(generalId, id); setOpen(null); }}
                className={cn('flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs',
                  id === currentOpen ? 'border-[#C6A15B] bg-[#C6A15B]/15' : 'border-stone-700')}>
                <GearArt id={id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="font-bold">{piece.name}</span>
                  {others > 0 && <span className="ml-1 text-[10px] text-stone-500">{others}명 장착</span>}
                  {id === currentOpen && <span className="ml-1 text-[10px] text-[#B8382E]">장착 중</span>}
                  <span className="mt-0.5 block text-[10px] text-[#8C6B2F] dark:text-[#C6A15B]">{effectLabel(piece.stat, gearBonus(piece, item), gearSkill(piece, item))}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1 text-[10px] text-stone-500">3칸 동시 · 성장은 장비 탭</p>
    </div>
  );
}
