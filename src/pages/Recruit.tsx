// 장수 등용(가챠) 화면
import { Coins, Flag, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GeneralCard, GeneralDetail } from '../components/General';
import { Btn, cn, Modal, Panel } from '../components/ui';
import { RECRUITABLE } from '../data/generals';
import { PULL_COST, RATES } from '../engine/gacha';
import { useGame, type RecruitResult } from '../store/gameStore';
import type { GeneralDef, Rarity } from '../types';

type Phase = 'idle' | 'summoning' | 'reveal';

export default function Recruit() {
  const gold = useGame((s) => s.gold);
  const roster = useGame((s) => s.roster);
  const recruit = useGame((s) => s.recruit);
  const totalPulls = useGame((s) => s.totalPulls);
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<RecruitResult[]>([]);
  const [detail, setDetail] = useState<GeneralDef | null>(null);

  function pull(count: 1 | 10) {
    const r = recruit(count);
    if (!r) return;
    setResults(r);
    setPhase('summoning');
    setTimeout(() => setPhase('reveal'), 1100);
  }

  const best: Rarity | null = results.some((r) => r.def.rarity === 'SSR') ? 'SSR' : results.some((r) => r.def.rarity === 'SR') ? 'SR' : results.length ? 'R' : null;
  const ownedCount = RECRUITABLE.filter((g) => roster[g.id]).length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-2xl font-black">장수 등용</h2>
          <p className="text-xs text-stone-500">금화로 재야의 장수를 초빙합니다. 이미 있는 장수가 나오면 돌파(★)로 능력치가 오릅니다.</p>
        </div>
        <span className="text-xs text-stone-400">도감 {ownedCount}/{RECRUITABLE.length}</span>
      </div>

      {/* 등용 무대 */}
      <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-stone-800 bg-[radial-gradient(ellipse_at_center,#292524_0%,#0c0a09_70%)] p-4">
        {phase === 'idle' && (
          <div className="text-center">
            <div className="relative mx-auto h-32 w-32">
              <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-red-800/60" />
              <div className="absolute inset-4 flex items-center justify-center rounded-full bg-red-950/60">
                <Flag size={44} className="text-red-400" />
              </div>
            </div>
            <p className="mt-4 font-serif text-lg text-stone-300">천하의 인재를 구하라</p>
            <p className="text-xs text-stone-500">누적 등용 {totalPulls}회</p>
          </div>
        )}

        {phase === 'summoning' && (
          <div className="text-center">
            <div className={cn('relative mx-auto h-36 w-36')}>
              <div className={cn('absolute inset-0 animate-spin rounded-full border-4 border-t-transparent',
                best === 'SSR' ? 'border-amber-300' : best === 'SR' ? 'border-violet-400' : 'border-red-500')} />
              <div className="absolute inset-6 flex items-center justify-center rounded-full bg-stone-900">
                <Flag size={48} className={cn('animate-wave', best === 'SSR' ? 'text-amber-300' : best === 'SR' ? 'text-violet-300' : 'text-red-400')} />
              </div>
            </div>
            <p className="mt-4 animate-pulse font-serif text-lg">
              {best === 'SSR' ? '하늘에 금빛 기운이 서린다…!' : best === 'SR' ? '보랏빛 기운이 감돈다…' : '장수를 찾는 중…'}
            </p>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="w-full">
            {best === 'SSR' && <div className="pointer-events-none absolute inset-0 animate-flash bg-amber-200/40" />}
            <div className={cn('mx-auto grid gap-2', results.length === 1 ? 'max-w-[180px] grid-cols-1' : 'grid-cols-3 sm:grid-cols-5')}>
              {results.map((r, i) => (
                <div key={i} className="animate-pop-in relative" style={{ animationDelay: `${i * 0.12}s` }}>
                  <GeneralCard def={r.def} highlight onClick={() => setDetail(r.def)} />
                  <span className={cn('absolute left-1/2 top-[52%] -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-px text-[10px] font-black',
                    r.isNew ? 'bg-red-600 text-white' : r.refund ? 'bg-stone-700 text-amber-200' : 'bg-amber-400 text-stone-900')}>
                    {r.isNew ? 'NEW' : r.refund ? `+${r.refund}금` : `돌파 ★${r.stars}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PullButton label="1회 등용" cost={PULL_COST.single} gold={gold} disabled={phase === 'summoning'} onClick={() => pull(1)} />
        <PullButton label="10연 등용" cost={PULL_COST.ten} gold={gold} disabled={phase === 'summoning'} onClick={() => pull(10)}
          note="SR 이상 1명 확정 · 10% 할인" gold10 />
      </div>

      <Panel title="등용 확률" icon={<Sparkles size={15} />}>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {(['SSR', 'SR', 'R'] as Rarity[]).map((r) => (
            <div key={r} className="rounded-lg bg-stone-950/60 p-2">
              <div className={cn('font-black', r === 'SSR' ? 'text-amber-300' : r === 'SR' ? 'text-violet-300' : 'text-stone-300')}>{r}</div>
              <div className="tabular text-stone-200">{Math.round(RATES[r] * 100)}%</div>
              <div className="text-[10px] text-stone-500">{RECRUITABLE.filter((g) => g.rarity === r).length}명</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-stone-500">돌파는 최대 ★5. 그 이후 중복은 금화로 환급됩니다 (SSR 300 · SR 120 · R 40).</p>
      </Panel>

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <GeneralDetail def={detail} owned={roster[detail.id]} />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setDetail(null)}>닫기</Btn>
        </Modal>
      )}
    </div>
  );
}

function PullButton({ label, cost, gold, onClick, disabled, note, gold10 }: {
  label: string; cost: number; gold: number; onClick: () => void; disabled?: boolean; note?: string; gold10?: boolean;
}) {
  const short = gold < cost;
  return (
    <Btn size="lg" variant={gold10 ? 'gold' : 'primary'} onClick={onClick} disabled={disabled || short} className="flex-col gap-0 py-3">
      <span>{label}</span>
      <span className="flex items-center gap-1 text-xs font-semibold opacity-80"><Coins size={12} /> {cost}{note && ` · ${note}`}</span>
      {short && <span className="text-[10px] font-normal">금화 부족 — 스테이지에서 획득하세요</span>}
    </Btn>
  );
}
