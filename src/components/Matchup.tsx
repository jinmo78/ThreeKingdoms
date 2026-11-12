// 병과 상성 힌트 UI
import { AlertTriangle, CheckCircle2, Compass } from 'lucide-react';
import { TROOP } from '../data/meta';
import { matchupGrade, matchupVs, TROOPS, troopAdvice } from '../engine/matchup';
import type { UnitProfile } from '../engine/unit';
import type { Troop } from '../types';
import { cn } from './ui';

/** 내 부대 하나의 상성 배지: "우위 2 · 열세 1" */
export function MatchupBadge({ troop, enemyTroops, className }: { troop: Troop; enemyTroops: Troop[]; className?: string }) {
  const m = matchupVs(troop, enemyTroops);
  const g = matchupGrade(m);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold',
      g === 'good' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
        : g === 'bad' ? 'border-red-500/50 bg-red-500/10 text-red-300'
          : 'border-stone-600 bg-stone-800/60 text-stone-400', className)}>
      {g === 'good' ? <CheckCircle2 size={11} /> : g === 'bad' ? <AlertTriangle size={11} /> : null}
      상성 우위 {m.adv} · 열세 {m.dis}
    </span>
  );
}

/** 스테이지 상성 분석: 적 주장 병과 → 추천 병과 → 내 부대별 판정 */
export function TroopAdviceBox({ enemy, mine, compact }: { enemy: UnitProfile[]; mine: UnitProfile[]; compact?: boolean }) {
  const enemyTroops = enemy.map((p) => p.troop);
  const advice = troopAdvice(enemyTroops);
  const worst = mine.filter((p) => matchupGrade(matchupVs(p.troop, enemyTroops)) === 'bad');

  return (
    <div className={cn('rounded-xl border p-3 text-xs', advice.lopsided ? 'border-amber-500/40 bg-amber-500/5' : 'border-stone-800 bg-stone-950/60')}>
      <div className="mb-1.5 flex items-center gap-1.5 font-bold text-stone-200">
        <Compass size={14} className="text-amber-400" /> 병과 상성 분석
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-400">
        <span>
          적 주장{' '}
          {TROOPS.filter((t) => advice.enemyCounts[t]).map((t) => (
            <span key={t} className="mr-1 text-stone-200">{TROOP[t].emoji}{TROOP[t].label}×{advice.enemyCounts[t]}</span>
          ))}
        </span>
        <span>
          → 추천 주장{' '}
          <b className="text-amber-300">{advice.best.map((t) => `${TROOP[t].emoji}${TROOP[t].label}`).join(' / ')}</b>
        </span>
      </div>
      {advice.lopsided && (
        <p className="mt-1 text-[11px] text-amber-200/80">적이 한 병과에 몰려 있어 상성이 승부를 크게 좌우합니다.</p>
      )}
      {!compact && mine.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-stone-800 pt-2">
          {mine.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="truncate text-stone-300">{TROOP[p.troop].emoji} {p.name}</span>
              <MatchupBadge troop={p.troop} enemyTroops={enemyTroops} />
            </div>
          ))}
          {worst.length > 0 && (
            <p className="text-[11px] text-red-300/90">
              ⚠ 열세인 부대는 주장을 {advice.best.map((t) => TROOP[t].label).join('·')} 장수로 바꿔 보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
