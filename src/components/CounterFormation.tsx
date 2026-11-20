// 적군 맞춤 편성: 버튼 + 계산 진행 + 결과 비교 모달
import { Brain, Lock, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GENERAL_MAP } from '../data/generals';
import { TROOP } from '../data/meta';
import type { CounterResult } from '../engine/counterFormation';
import { COUNTER_GOLD } from '../engine/formationBook';
import { shownRarity } from '../engine/unit';
import { useGame } from '../store/gameStore';
import type { EnemyUnit, Unit } from '../types';
import { SLOTS } from '../types';
import { GeneralToken } from './General';
import { Bar, Btn, cn, Hint, Modal } from './ui';

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; ratio: number; best: number }
  | { kind: 'done'; result: CounterResult; refunded: boolean };

export function CounterFormationButton({ enemies, unlocked, lockedNote, className, size = 'md' }: {
  enemies: EnemyUnit[]; unlocked: boolean; lockedNote?: string; className?: string; size?: 'sm' | 'md';
}) {
  const cleared = unlocked;
  const gold = useGame((s) => s.gold);
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const formation = useGame((s) => s.formation);
  const applyFormation = useGame((s) => s.applyFormation);
  const adjustGold = useGame((s) => s.adjustGold);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const workerRef = useRef<Worker | null>(null);
  const paidRef = useRef(false);
  const canPay = gold >= COUNTER_GOLD;

  useEffect(() => () => workerRef.current?.terminate(), []);

  function refund() {
    if (!paidRef.current) return;
    paidRef.current = false;
    adjustGold(COUNTER_GOLD);
  }

  function run() {
    if (!cleared || paidRef.current) return;
    if (!adjustGold(-COUNTER_GOLD)) return;
    paidRef.current = true;
    workerRef.current?.terminate();
    const w = new Worker(new URL('../workers/counter.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    setPhase({ kind: 'running', ratio: 0, best: 0 });
    w.onmessage = (e: MessageEvent) => {
      if (!paidRef.current) return;
      if (e.data.type === 'progress') setPhase({ kind: 'running', ratio: e.data.ratio, best: e.data.best });
      if (e.data.type === 'done') {
        const result = e.data.result as CounterResult;
        const refunded = !result.improved;
        if (refunded) refund();
        setPhase({ kind: 'done', result, refunded });
        w.terminate();
        workerRef.current = null;
      }
    };
    w.onerror = () => {
      refund();
      setPhase({ kind: 'idle' });
      w.terminate();
      workerRef.current = null;
    };
    w.postMessage({ roster, formation, enemies, gear, budgetMs: 3000 });
  }

  function close() {
    const running = phase.kind === 'running';
    workerRef.current?.terminate();
    workerRef.current = null;
    if (running) refund();
    else paidRef.current = false;
    setPhase({ kind: 'idle' });
  }

  return (
    <>
      <Btn variant="outline" size={size} className={className} disabled={!cleared || !canPay} onClick={run}
        title={lockedNote}>
        {cleared ? <Brain size={15} /> : <Lock size={14} />}
        상성 추천
        <span className="text-[10px] font-normal opacity-80">{cleared ? `🪙${COUNTER_GOLD}` : '잠금'}</span>
      </Btn>

      {phase.kind !== 'idle' && (
        <Modal onClose={close} wide={phase.kind === 'done' && phase.result.improved}>
          <div className="mb-3 flex shrink-0 items-center gap-2 font-serif text-lg font-black">
            <Brain size={18} className="text-amber-300" /> 상성 추천
          </div>

          {phase.kind === 'running' && (
            <div className="space-y-3 py-4 text-center">
              <Loader2 size={32} className="mx-auto animate-spin text-amber-300" />
              <p className="text-sm font-bold text-stone-200">계산 중 · 🪙{COUNTER_GOLD}</p>
              <Bar value={phase.ratio} max={1} color="bg-amber-400" />
              <p className="text-xs text-stone-500">최고 {Math.round(phase.best * 100)}%</p>
            </div>
          )}

          {phase.kind === 'done' && (
            <ResultView result={phase.result} refunded={phase.refunded} onApply={() => { applyFormation(phase.result.formation); close(); }} onClose={close} />
          )}
        </Modal>
      )}
    </>
  );
}

function ResultView({ result, refunded, onApply, onClose }: { result: CounterResult; refunded: boolean; onApply: () => void; onClose: () => void }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-4', result.improved && 'overflow-hidden')}>
      <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-stone-950/70 p-3">
          <div className="text-[11px] text-stone-500">현재</div>
          <div className="tabular text-2xl font-black text-stone-300">{pct(result.before)}</div>
        </div>
        <div className={cn('rounded-xl p-3', result.improved ? 'bg-emerald-500/10' : 'bg-stone-950/70')}>
          <div className="text-[11px] text-stone-500">추천</div>
          <div className={cn('tabular text-2xl font-black', result.improved ? 'text-emerald-300' : 'text-stone-300')}>{pct(result.after)}</div>
        </div>
      </div>

      {result.improved ? (
        <>
          <p className="flex shrink-0 items-center justify-center gap-1 text-xs font-bold text-stone-200">
            승률 {pct(result.before)} → {pct(result.after)}
            <Hint text={`🪙${COUNTER_GOLD} · ${result.tried.toLocaleString()}안을 각각 100번, 검증 400번. 더 나은 안이 없거나 닫으면 환불.`} />
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <FormationPreview units={result.formation} />
          </div>
          <div className="flex shrink-0 gap-2 border-t border-stone-800 pt-3">
            <Btn className="flex-1" onClick={onApply}>적용</Btn>
            <Btn variant="ghost" onClick={onClose}>유지</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-stone-200">더 나은 편성 없음</p>
          {refunded && <p className="text-xs text-amber-300">환불 🪙{COUNTER_GOLD}</p>}
          <Btn variant="ghost" className="w-full" onClick={onClose}>닫기</Btn>
        </>
      )}
    </div>
  );
}

function FormationPreview({ units }: { units: Unit[] }) {
  const roster = useGame((s) => s.roster);
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {units.map((u, i) => {
        const cmd = u.commander ? GENERAL_MAP[u.commander] : undefined;
        if (!cmd) return null;
        return (
          <div key={i} className="min-w-0 rounded-xl border border-stone-800 bg-stone-950/50 p-2">
            <div className="mb-1.5 text-xs font-bold">
              제{i + 1}부대 <span className="font-normal text-stone-400">{TROOP[cmd.troop].emoji} {cmd.name} 부대</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SLOTS.map((s) => {
                const def = u[s] ? GENERAL_MAP[u[s]!] : undefined;
                return def ? (
                  <div key={s} className="flex min-w-0 flex-col items-center">
                    <GeneralToken def={def} rarity={shownRarity(def.rarity, roster[def.id]?.promote)} size="sm" />
                    <span className="max-w-[4.5rem] truncate text-[10px] text-stone-400">{def.name}</span>
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
