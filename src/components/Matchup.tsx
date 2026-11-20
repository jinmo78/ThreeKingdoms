// 병과 상성 힌트 UI
import { AlertTriangle, CheckCircle2, Compass } from 'lucide-react';
import { TROOP } from '../data/meta';
import { briefOf, matchupGrade, matchupVs, TROOPS, troopAdvice } from '../engine/matchup';
import type { UnitProfile } from '../engine/unit';
import type { Troop } from '../types';
import { cn } from './ui';

/** 내 부대 하나의 상성 배지: "우위 2 · 열세 1" */
export function MatchupBadge({ troop, enemyTroops, className }: { troop: Troop; enemyTroops: Troop[]; className?: string }) {
  const g = matchupGrade(matchupVs(troop, enemyTroops));
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold',
      g === 'good' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
        : g === 'bad' ? 'border-red-500/50 bg-red-500/10 text-red-300'
          : 'border-stone-600 bg-stone-800/60 text-stone-400', className)}>
      {g === 'good' ? <CheckCircle2 size={11} /> : g === 'bad' ? <AlertTriangle size={11} /> : null}
      {g === 'good' ? '유리 ×1.25' : g === 'bad' ? '불리 ×0.8' : '호각'}
    </span>
  );
}

/** 스테이지 상성 분석: 적 주장 병과 → 추천 병과 → 내 부대별 판정 */
export function TroopAdviceBox({ enemy, mine, compact }: { enemy: UnitProfile[]; mine: UnitProfile[]; compact?: boolean }) {
  const enemyTroops = enemy.map((p) => p.troop);
  const advice = troopAdvice(enemy.map(briefOf));
  const label = (t: Troop) => `${TROOP[t].emoji}${TROOP[t].label}`;

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1 font-bold">
        <Compass size={14} className="text-amber-300" />
        <span>🐎&gt;🏹&gt;🛡️&gt;🐎</span>
        {advice.best.map((t) => (
          <span key={t} className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-200">{TROOP[t].label} 추천</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {TROOPS.filter((t) => advice.enemyCounts[t]).map((t) => (
          <span key={t} className="rounded px-1.5 py-0.5 font-bold ring-1 ring-stone-600">{label(t)}×{advice.enemyCounts[t]}</span>
        ))}
      </div>
      {!compact && mine.length > 0 && (
        <div className="space-y-1">
          {mine.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{TROOP[p.troop].emoji} {p.name}</span>
              <MatchupBadge troop={p.troop} enemyTroops={enemyTroops} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
