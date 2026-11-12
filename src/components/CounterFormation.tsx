// 적군 맞춤 편성: 버튼 + 계산 진행 + 결과 비교 모달
import { Brain, Lock, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getGeneral } from '../data/generals';
import { TROOP } from '../data/meta';
import type { CounterResult } from '../engine/counterFormation';
import { useGame } from '../store/gameStore';
import type { EnemyUnit, Unit } from '../types';
import { SLOTS } from '../types';
import { GeneralToken } from './General';
import { Bar, Btn, cn, Modal } from './ui';

type Phase = { kind: 'idle' } | { kind: 'running'; ratio: number; best: number } | { kind: 'done'; result: CounterResult };

export function CounterFormationButton({ enemies, unlocked, lockedNote, className }: {
  enemies: EnemyUnit[]; unlocked: boolean; lockedNote?: string; className?: string;
}) {
  const cleared = unlocked;
  const roster = useGame((s) => s.roster);
  const formation = useGame((s) => s.formation);
  const applyFormation = useGame((s) => s.applyFormation);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  function run() {
    workerRef.current?.terminate();
    const w = new Worker(new URL('../workers/counter.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    setPhase({ kind: 'running', ratio: 0, best: 0 });
    w.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'progress') setPhase({ kind: 'running', ratio: e.data.ratio, best: e.data.best });
      if (e.data.type === 'done') {
        setPhase({ kind: 'done', result: e.data.result as CounterResult });
        w.terminate();
        workerRef.current = null;
      }
    };
    w.postMessage({ roster, formation, enemies, budgetMs: 3000 });
  }

  function close() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setPhase({ kind: 'idle' });
  }

  return (
    <>
      <Btn variant="outline" className={className} disabled={!cleared} onClick={run}
        title={cleared ? '이 스테이지 적군을 상대로 전투를 수천 번 시뮬레이션해 승률이 높은 편성을 찾습니다' : undefined}>
        {cleared ? <Brain size={15} /> : <Lock size={14} />}
        적군 맞춤 편성
        {!cleared && lockedNote && <span className="text-[10px] font-normal opacity-80">({lockedNote})</span>}
      </Btn>

      {phase.kind !== 'idle' && (
        <Modal onClose={close}>
          <div className="mb-3 flex items-center gap-2 font-serif text-lg font-black">
            <Brain size={18} className="text-amber-300" /> 적군 맞춤 편성
          </div>

          {phase.kind === 'running' && (
            <div className="space-y-3 py-4 text-center">
              <Loader2 size={32} className="mx-auto animate-spin text-amber-300" />
              <p className="text-sm text-stone-300">군사들이 전투를 시뮬레이션하는 중…</p>
              <Bar value={phase.ratio} max={1} color="bg-amber-400" />
              <p className="text-xs text-stone-500">지금까지 찾은 최고 승률 {Math.round(phase.best * 100)}%</p>
            </div>
          )}

          {phase.kind === 'done' && (
            <ResultView result={phase.result} onApply={() => { applyFormation(phase.result.formation); close(); }} onClose={close} />
          )}
        </Modal>
      )}
    </>
  );
}

function ResultView({ result, onApply, onClose }: { result: CounterResult; onApply: () => void; onClose: () => void }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-stone-950/70 p-3">
          <div className="text-[11px] text-stone-500">현재 편성 예상 승률</div>
          <div className="tabular text-2xl font-black text-stone-300">{pct(result.before)}</div>
        </div>
        <div className={cn('rounded-xl p-3', result.improved ? 'bg-emerald-500/10' : 'bg-stone-950/70')}>
          <div className="text-[11px] text-stone-500">맞춤 편성 예상 승률</div>
          <div className={cn('tabular text-2xl font-black', result.improved ? 'text-emerald-300' : 'text-stone-300')}>{pct(result.after)}</div>
        </div>
      </div>

      {result.improved ? (
        <>
          <p className="text-xs text-stone-400">
            편성 {result.tried.toLocaleString()}가지를 각각 100번씩 싸워 보고, 새 전투 400번으로 다시 검증한 결과입니다.
          </p>
          <FormationPreview units={result.formation} />
          <div className="flex gap-2">
            <Btn className="flex-1" onClick={onApply}>이 편성 적용</Btn>
            <Btn variant="ghost" onClick={onClose}>취소</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-stone-300">현재 편성보다 확실히 나은 조합을 찾지 못했습니다. 지금 편성을 유지하세요.</p>
          <p className="text-xs text-stone-500">새 장수를 등용하거나 레벨을 올린 뒤 다시 시도해 보세요.</p>
          <Btn variant="ghost" className="w-full" onClick={onClose}>닫기</Btn>
        </>
      )}
    </div>
  );
}

function FormationPreview({ units }: { units: Unit[] }) {
  return (
    <div className="space-y-2">
      {units.map((u, i) => {
        if (!u.commander) return null;
        const cmd = getGeneral(u.commander);
        return (
          <div key={i} className="rounded-xl border border-stone-800 bg-stone-950/50 p-2">
            <div className="mb-1.5 text-xs font-bold">
              제{i + 1}부대 <span className="font-normal text-stone-400">{TROOP[cmd.troop].emoji} {cmd.name} 부대</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SLOTS.map((s) => {
                const id = u[s];
                return id ? (
                  <div key={s} className="flex flex-col items-center">
                    <GeneralToken def={getGeneral(id)} size="sm" />
                    <span className="text-[10px] text-stone-400">{getGeneral(id).name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
