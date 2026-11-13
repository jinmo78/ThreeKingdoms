// 적/아군 부대 미리보기와 전투력 비교 (원정 · 도전 화면 공용)
import { FACTION } from '../data/meta';
import { shownRarity, type UnitProfile } from '../engine/unit';
import { GeneralToken, SynergyList } from './General';
import { cn } from './ui';

export function UnitPreview({ p }: { p: UnitProfile }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex -space-x-2">
          {p.members.map((m, i) => m && <GeneralToken key={i} def={m.def} rarity={shownRarity(m.def.rarity, m.promote)} size="sm" />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{p.name}</div>
          <div className="truncate text-[11px] text-stone-500">
            {p.members.map((m) => m && <span key={m.def.id} className={cn('mr-1', FACTION[m.def.faction].text)}>{m.def.name}</span>)}
            · Lv.{p.members[0]!.level}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-stone-500">전투력</div>
          <div className="tabular text-sm font-bold text-amber-300">{p.power.toLocaleString()}</div>
        </div>
      </div>
      <SynergyList synergy={p.synergy} empty="시너지 없음" />
    </div>
  );
}

export function PowerCompare({ mine, enemy }: { mine: number; enemy: number }) {
  const total = mine + enemy || 1;
  const ratio = mine / (enemy || 1);
  const verdict = ratio >= 1.25 ? ['우세', 'text-emerald-300'] : ratio >= 0.95 ? ['접전', 'text-amber-300'] : ['열세', 'text-red-300'];
  return (
    <div className="mt-4 rounded-xl bg-stone-950/60 p-3">
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-stone-400">아군 <b className="tabular text-stone-100">{mine.toLocaleString()}</b></span>
        <span className={cn('font-bold', verdict[1])}>{verdict[0]}</span>
        <span className="text-stone-400"><b className="tabular text-stone-100">{enemy.toLocaleString()}</b> 적군</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-stone-800">
        <div className="bg-sky-500 transition-all" style={{ width: `${(mine / total) * 100}%` }} />
        <div className="flex-1 bg-red-600" />
      </div>
      <p className="mt-1.5 hidden text-[10px] text-stone-500 sm:block">전투력은 참고치입니다. 병과 상성과 연쇄 전법이 승부를 뒤집을 수 있습니다.</p>
    </div>
  );
}
