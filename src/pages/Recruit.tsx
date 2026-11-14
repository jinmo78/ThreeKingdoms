// 장수 등용(가챠) 화면
import { Coins, Flag, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GeneralCard, GeneralDetail } from '../components/General';
import { sceneUrl } from '../components/PageHero';
import { Btn, cn, Modal, Panel } from '../components/ui';
import { RECRUITABLE } from '../data/generals';
import { DAILY_PULLS, DUPLICATE_REFUND, PULL_COST, pullsRemaining, RATES } from '../engine/gacha';
import { useGame, type RecruitResult } from '../store/gameStore';
import type { GeneralDef, Rarity } from '../types';

type Phase = 'idle' | 'summoning' | 'reveal';

export default function Recruit() {
  const gold = useGame((s) => s.gold);
  const roster = useGame((s) => s.roster);
  const recruit = useGame((s) => s.recruit);
  const totalPulls = useGame((s) => s.totalPulls);
  const recruitDay = useGame((s) => s.recruitDay);
  const recruitUsed = useGame((s) => s.recruitUsed);
  const left = pullsRemaining(recruitDay, recruitUsed);
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<RecruitResult[]>([]);
  const [detail, setDetail] = useState<GeneralDef | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);

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
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl font-black">장수 등용</h2>
          <span className="shrink-0 text-xs text-stone-400">도감 {ownedCount}/{RECRUITABLE.length}</span>
        </div>
        <p className="text-xs text-stone-500">금화로 재야의 장수를 초빙합니다. 이미 있는 장수는 돌파(★)로 오르고, 장수록에서 품계를 한 단계 올릴 수 있습니다. 등용은 하루 {DAILY_PULLS}회까지입니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PullButton label="1회 등용" cost={PULL_COST.single} gold={gold} left={left} need={1} disabled={phase === 'summoning'} onClick={() => pull(1)} />
        <PullButton label="10연 등용" cost={PULL_COST.ten} gold={gold} left={left} need={10} disabled={phase === 'summoning'} onClick={() => pull(10)}
          note="SR 이상 확정" gold10 />
      </div>
      <p className="text-center text-[11px] text-stone-500">오늘 남은 등용 {left}/{DAILY_PULLS}</p>

      {/* 등용 무대 */}
      <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 p-4">
        <img src={sceneUrl('scene-recruit.webp')} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover brightness-[1.85] contrast-[1.05] saturate-[1.08]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        <div className="relative w-full">
        {phase === 'idle' && (
          <div className="text-center">
            <div className="relative mx-auto h-32 w-32">
              <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-red-800/60" />
              <div className="absolute inset-4 flex items-center justify-center rounded-full bg-red-950/60">
                <Flag size={44} className="text-red-300" />
              </div>
            </div>
            <p className="mt-4 font-serif text-lg text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">천하의 인재를 구하라</p>
            <p className="text-xs text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">누적 등용 {totalPulls}회</p>
          </div>
        )}

        {phase === 'summoning' && (
          <div className="text-center">
            <div className={cn('relative mx-auto h-36 w-36')}>
              <div className={cn('absolute inset-0 animate-spin rounded-full border-4 border-t-transparent',
                best === 'SSR' ? 'border-amber-500' : best === 'SR' ? 'border-violet-400' : 'border-red-500')} />
              <div className="absolute inset-6 flex items-center justify-center rounded-full bg-stone-900">
                <Flag size={48} className={cn('animate-wave', best === 'SSR' ? 'text-amber-300' : best === 'SR' ? 'text-violet-300' : 'text-red-300')} />
              </div>
            </div>
            <p className="mt-4 animate-pulse font-serif text-lg text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {best === 'SSR' ? '하늘에 금빛 기운이 서린다…!' : best === 'SR' ? '보랏빛 기운이 감돈다…' : '장수를 찾는 중…'}
            </p>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="w-full">
            {best === 'SSR' && <div className="pointer-events-none absolute inset-0 animate-flash bg-amber-400/40" />}
            <p className="mb-2 text-center text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              금화 -{results.length === 10 ? PULL_COST.ten : PULL_COST.single}
              {results.some((r) => r.refund) && ` · 중복 환급 +${results.reduce((n, r) => n + r.refund, 0)}`}
            </p>
            <div className={cn('mx-auto grid gap-2', results.length === 1 ? 'max-w-[180px] grid-cols-1' : 'grid-cols-3 sm:grid-cols-5')}>
              {results.map((r, i) => (
                <div key={i} className="animate-pop-in relative" style={{ animationDelay: `${i * 0.12}s` }}>
                  <GeneralCard def={r.def} highlight onClick={() => setDetail(r.def)} />
                  <span className={cn('absolute left-1/2 top-[52%] -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-px text-[10px] font-black',
                    r.isNew ? 'bg-red-600 text-white' : r.refund ? 'bg-stone-700 text-amber-200' : 'bg-amber-400 text-[#1c1612]')}>
                    {r.isNew ? 'NEW' : r.refund ? `+${r.refund}금` : `돌파 ★${r.stars}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="hidden sm:block">
        <Panel title="등용 확률" icon={<Sparkles size={15} />}><RatesBody /></Panel>
      </div>
      <button type="button" onClick={() => setRatesOpen(true)}
        className="w-full rounded-xl border border-stone-700 py-2.5 text-xs font-bold text-stone-300 sm:hidden">
        등용 확률
      </button>

      {ratesOpen && (
        <Modal onClose={() => setRatesOpen(false)}>
          <h3 className="mb-3 font-serif text-lg font-black">등용 확률</h3>
          <RatesBody />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setRatesOpen(false)}>닫기</Btn>
        </Modal>
      )}

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <GeneralDetail def={detail} owned={roster[detail.id]} />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setDetail(null)}>닫기</Btn>
        </Modal>
      )}
    </div>
  );
}

function RatesBody() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {(['SSR', 'SR', 'R'] as Rarity[]).map((r) => (
          <div key={r} className="rounded-lg bg-stone-950/60 p-2">
            <div className={cn('font-black', r === 'SSR' ? 'text-amber-300' : r === 'SR' ? 'text-violet-300' : 'text-stone-300')}>{r}</div>
            <div className="tabular text-stone-200">{Math.round(RATES[r] * 100)}%</div>
            <div className="text-[10px] text-stone-500">{RECRUITABLE.filter((g) => g.rarity === r).length}명</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-stone-500">돌파는 최대 ★5. 그 이후 중복은 금화로 조금 돌아옵니다 (SSR {DUPLICATE_REFUND.SSR} · SR {DUPLICATE_REFUND.SR} · R {DUPLICATE_REFUND.R}). 등용은 하루 {DAILY_PULLS}회까지입니다.</p>
    </>
  );
}

function PullButton({ label, cost, gold, left, need, onClick, disabled, note, gold10 }: {
  label: string; cost: number; gold: number; left: number; need: number; onClick: () => void; disabled?: boolean; note?: string; gold10?: boolean;
}) {
  const short = gold < cost;
  const dailyShort = left < need;
  return (
    <Btn size="md" variant={gold10 ? 'gold' : 'primary'} onClick={onClick} disabled={disabled || short || dailyShort} className="h-full w-full flex-col gap-0 px-2 py-2">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1 text-[11px] font-semibold opacity-80"><Coins size={11} /> {cost}</span>
      {note && !short && !dailyShort && <span className="text-[10px] font-normal leading-tight">{note}</span>}
      {dailyShort && <span className="text-[10px] font-normal leading-tight">오늘 횟수 부족</span>}
      {short && !dailyShort && <span className="text-[10px] font-normal leading-tight">금화 부족</span>}
    </Btn>
  );
}
