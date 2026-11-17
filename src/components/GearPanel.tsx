// 장비 가방. 레벨·강화·등급은 파편과 금화로 올리고, 장수 한 명에게만 끼운다.
import { GEAR, GEAR_MAP, GEAR_SLOT_LABEL } from '../data/gear';
import { RARITY, STAT_LABEL } from '../data/meta';
import { GENERAL_MAP } from '../data/generals';
import {
  GEAR_MAX_ENHANCE, GEAR_MAX_LEVEL, GEAR_PROMOTE_SHARDS,
  gearBonus, gearEnhanceCost, gearLevelCost, gearPromoteCost, gearPromoteLeft, gearRarity, wearerOf,
} from '../engine/gear';
import { useGame } from '../store/gameStore';
import type { GearSlot } from '../types';
import { cn } from './ui';

const SLOT_ORDER: GearSlot[] = ['weapon', 'armor', 'tome'];

export function GearBag() {
  const bag = useGame((s) => s.gear);
  const roster = useGame((s) => s.roster);
  const gold = useGame((s) => s.gold);
  const equipGear = useGame((s) => s.equipGear);
  const gearLevelUp = useGame((s) => s.gearLevelUp);
  const gearEnhance = useGame((s) => s.gearEnhance);
  const gearPromote = useGame((s) => s.gearPromote);
  const ownedIds = GEAR.map((g) => g.id).filter((id) => bag[id]);
  const generals = Object.keys(roster).flatMap((id) => {
    const def = GENERAL_MAP[id];
    return def ? [{ id, name: def.name }] : [];
  });

  if (ownedIds.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-700 p-4 text-center text-xs text-stone-500">
        아직 장비가 없습니다. 원정이나 토벌전에서 이기면 여기에 쌓입니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-stone-500">
        원정 첫 승리에 그 장의 장비가 나오고, 이미 가진 장비가 다시 나오면 파편입니다. 깬 스테이지를 다시 이기면 가끔 파편이 더 나옵니다. 토벌전 승리도 파편을 줍니다.
        레벨은 파편 1개, 강화는 파편 2개, 등급은 Lv.{GEAR_MAX_LEVEL}·강화 +{GEAR_MAX_ENHANCE}에서 파편 {GEAR_PROMOTE_SHARDS}개로 R → SR → SSR까지 올립니다.
      </p>
      {SLOT_ORDER.map((slot) => {
        const list = ownedIds.filter((id) => GEAR_MAP[id]?.slot === slot);
        if (list.length === 0) return null;
        return (
          <section key={slot}>
            <h3 className="mb-2 text-sm font-black text-stone-300">{GEAR_SLOT_LABEL[slot]}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((id) => {
                const def = GEAR_MAP[id];
                const item = bag[id];
                const rank = gearRarity(def, item.promote);
                const bonus = gearBonus(def, item);
                const wearer = wearerOf(roster, id);
                const nextRank = gearPromoteLeft(def, item.promote) > 0 ? gearRarity(def, item.promote + 1) : null;
                const levelCost = gearLevelCost(item.level);
                const enhanceCost = gearEnhanceCost(item.enhance);
                const promoteCost = nextRank === 'SR' || nextRank === 'SSR' ? gearPromoteCost(nextRank) : 0;
                const ready = item.level >= GEAR_MAX_LEVEL && item.enhance >= GEAR_MAX_ENHANCE;
                return (
                  <div key={id} className={cn('rounded-xl border p-3', RARITY[rank].border, 'bg-stone-900/70')}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('rounded px-1 py-0.5 text-[10px] font-black', RARITY[rank].badge)}>{rank}</span>
                      <span className="font-bold">{def.name}</span>
                      <span className="ml-auto text-xs font-bold text-amber-300">{STAT_LABEL[def.stat]} +{bonus}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500">{def.desc}</p>
                    <div className="mt-1 text-[11px] text-stone-400">
                      Lv.{item.level}/{GEAR_MAX_LEVEL} · 강화 +{item.enhance} · 파편 {item.shards}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-stone-400">
                      장착
                      <select
                        value={wearer ?? ''}
                        onChange={(e) => equipGear(e.target.value || null, id)}
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
                        onClick={() => gearLevelUp(id)}
                        note={item.level >= GEAR_MAX_LEVEL ? '최대' : `파편 1 · 금 ${levelCost}`}
                      />
                      <GrowBtn
                        label="강화"
                        disabled={item.enhance >= GEAR_MAX_ENHANCE || item.shards < 2 || gold < enhanceCost}
                        onClick={() => gearEnhance(id)}
                        note={item.enhance >= GEAR_MAX_ENHANCE ? '최대' : `파편 2 · 금 ${enhanceCost}`}
                      />
                      {nextRank && (
                        <GrowBtn
                          label={`${nextRank} 등급`}
                          disabled={!ready || item.shards < GEAR_PROMOTE_SHARDS || gold < promoteCost}
                          onClick={() => gearPromote(id)}
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

/** 장수 상세에 끼운 장비만 보여 준다. 바꾸고 성장시키는 곳은 장비 탭. */
export function EquippedGear({ generalId }: { generalId: string }) {
  const roster = useGame((s) => s.roster);
  const bag = useGame((s) => s.gear);
  const owned = roster[generalId];
  if (!owned) return null;
  return (
    <div>
      <div className="text-xs font-bold text-stone-400">장비</div>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {SLOT_ORDER.map((slot) => {
          const id = owned.gear?.[slot];
          const def = id ? GEAR_MAP[id] : undefined;
          const item = id ? bag[id] : undefined;
          return (
            <div key={slot} className="rounded-lg bg-stone-950/60 px-2 py-1.5 text-[11px]">
              <div className="text-stone-500">{GEAR_SLOT_LABEL[slot]}</div>
              {def && item ? (
                <>
                  <div className="truncate font-bold text-stone-100">{def.name}</div>
                  <div className="text-amber-300">{STAT_LABEL[def.stat]} +{gearBonus(def, item)}</div>
                </>
              ) : (
                <div className="text-stone-600">없음</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-stone-500">편성 화면 아래 장비에서 끼우고 성장시킵니다.</p>
    </div>
  );
}
