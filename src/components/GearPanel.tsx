// 장비 가방. 레벨·강화·등급은 파편과 금화로 올리고, 장수 한 명에게만 끼운다.
import { useState } from 'react';
import { GEAR, GEAR_MAP, GEAR_SLOT_LABEL } from '../data/gear';
import { RARITY, STAT_LABEL } from '../data/meta';
import { GENERAL_MAP } from '../data/generals';
import {
  GEAR_MAX_ENHANCE, GEAR_MAX_LEVEL, GEAR_PROMOTE_SHARDS,
  gearBonus, gearEnhanceCost, gearLevelCost, gearPromoteCost, gearPromoteLeft, gearRarity, wearerOf,
} from '../engine/gear';
import { useGame } from '../store/gameStore';
import type { GearSlot, Stats } from '../types';
import { GearArt } from './GearArt';
import { cn, NameSearch } from './ui';

const SLOT_ORDER: GearSlot[] = ['weapon', 'armor', 'tome'];

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
      <p className="text-[11px] leading-relaxed text-stone-500">
        획득 {ownedCount}/{GEAR.length}. 흐린 그림은 아직 없는 장비입니다. 원정 첫 승리에 그 장의 장비가 나오고, 이미 가진 장비가 다시 나오면 파편입니다.
        레벨은 파편 1개, 강화는 파편 2개, 등급은 Lv.{GEAR_MAX_LEVEL}·강화 +{GEAR_MAX_ENHANCE}에서 파편 {GEAR_PROMOTE_SHARDS}개로 올립니다.
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
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((def) => {
                const item = bag[def.id];
                if (!item) {
                  return (
                    <div key={def.id} className="flex gap-2 rounded-xl border border-dashed border-stone-700 bg-stone-950/40 p-3">
                      <GearArt id={def.id} dim />
                      <div className="min-w-0">
                        <div className="font-bold text-stone-400">{def.name}</div>
                        <p className="mt-1 text-[11px] text-stone-500">{def.desc} {SLOT_FIT[def.slot].who}에게 맞습니다.</p>
                        <div className="mt-1 text-[11px] text-stone-600">미획득 · 원정·토벌전</div>
                      </div>
                    </div>
                  );
                }
                const rank = gearRarity(def, item.promote);
                const bonus = gearBonus(def, item);
                const wearer = wearerOf(roster, def.id);
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
                          <span className="ml-auto text-xs font-bold text-amber-300">{STAT_LABEL[def.stat]} +{bonus}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-stone-500">{def.desc} {SLOT_FIT[def.slot].who}에게 맞습니다.</p>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-stone-400">
                      Lv.{item.level}/{GEAR_MAX_LEVEL} · 강화 +{item.enhance} · 파편 {item.shards}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-stone-400">
                      장착
                      <select
                        value={wearer ?? ''}
                        onChange={(e) => equipGear(e.target.value || null, def.id)}
                        className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-200"
                      >
                        <option value="">보관</option>
                        {generals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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
            </div>
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
        <p className="py-6 text-center text-xs text-stone-500">조건에 맞는 장비가 없습니다.</p>
      )}
    </div>
  );
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
  const owned = roster[generalId];
  const general = GENERAL_MAP[generalId];
  if (!owned || !general) return null;
  const best = recommendedSlots(general.stats);
  const advice = best.length === SLOT_ORDER.length
    ? '무력·통솔·지력이 비슷합니다. 세 칸 모두 도움이 됩니다.'
    : `먼저 끼울 칸은 ${best.map((slot) => SLOT_FIT[slot].gear).join(' · ')}입니다. ${best.map((slot) => STAT_LABEL[SLOT_FIT[slot].stat]).join(' · ')}을 올립니다.`;
  const ownedIds = Object.keys(bag);
  return (
    <div>
      <div className="text-xs font-bold text-stone-400">장비</div>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{advice} 세 칸은 함께 낄 수 있습니다.</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {SLOT_ORDER.map((slot) => {
          const current = owned.gear?.[slot] ?? '';
          const choices = ownedIds.filter((id) => GEAR_MAP[id]?.slot === slot);
          const worn = current ? GEAR_MAP[current] : undefined;
          const wornItem = current ? bag[current] : undefined;
          return (
            <label key={slot} className="rounded-lg bg-stone-950/60 px-2 py-1.5 text-[11px]">
              <div className="flex items-center gap-1 text-stone-500">
                {current ? <GearArt id={current} size="sm" /> : null}
                <span>{GEAR_SLOT_LABEL[slot]}</span>
                {best.includes(slot) && <span className="rounded bg-amber-400/20 px-1 text-[10px] font-bold text-amber-300">추천</span>}
              </div>
              <select
                value={current}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) {
                    if (current) equipGear(null, current);
                    return;
                  }
                  equipGear(generalId, next);
                }}
                className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-1 py-1 text-[11px] text-stone-100"
              >
                <option value="">없음</option>
                {choices.map((id) => {
                  const piece = GEAR_MAP[id];
                  const wearer = wearerOf(roster, id);
                  const who = wearer && wearer !== generalId ? GENERAL_MAP[wearer]?.name : null;
                  return (
                    <option key={id} value={id}>
                      {piece.name}{who ? ` · ${who}` : ''}
                    </option>
                  );
                })}
              </select>
              <div className="mt-1 text-amber-300">
                {worn && wornItem ? `${STAT_LABEL[worn.stat]} +${gearBonus(worn, wornItem)}` : SLOT_FIT[slot].who}
              </div>
            </label>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-stone-500">레벨·강화·등급은 편성 화면의 장비에서 올립니다.</p>
    </div>
  );
}
