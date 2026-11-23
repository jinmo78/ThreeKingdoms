// 내정: 점령한 성의 수입 징수 · 투자 · 수비 부대, 그리고 지도 위쪽의 영지 요약줄
import { Coins } from 'lucide-react';
import { useState } from 'react';
import { stageIndex } from '../data/stages';
import {
  CASTLE_MAX_LEVEL, STORE_CAP_HOURS, accrued, incomePerHour, upgradeCost, type Castle,
} from '../engine/domain';
import { useGame } from '../store/gameStore';
import type { SquadRow } from './SiegePanel';
import { cn } from './ui';

const fmt = (n: number) => Math.floor(n).toLocaleString('ko-KR');

/** 지도 위 영지 요약: 전체 시간당 수입과 지금 징수할 수 있는 금화 */
export function DomainBar({ castles, now, compact }: { castles: Record<string, Castle>; now: number; compact?: boolean }) {
  const collectGold = useGame((s) => s.collectGold);
  const threats = useGame((s) => s.threats);
  const [msg, setMsg] = useState('');
  const list = Object.entries(castles);
  if (list.length === 0) return null;
  const income = list.reduce((n, [id, c]) => n + incomePerHour(stageIndex(id), c), 0);
  const stored = list.reduce((n, [id, c]) => n + accrued(stageIndex(id), c, now), 0);
  const threatN = threats.filter((t) => castles[t.stageId]).length;
  if (compact) {
    // 가로 화면 위 바용 한 줄
    return (
      <div className="flex h-8 items-center gap-2 rounded-full border border-[#C6A15B]/50 bg-[#1b1713] py-0.5 pl-3 pr-0.5 text-[11px] text-[#E7DCC8]">
        <span>🏯 {list.length}성 · <b className="tabular text-amber-300">{fmt(income)}</b>/시{threatN > 0 && <b className="ml-1 text-red-300">⚔{threatN}</b>}</span>
        <button
          type="button"
          disabled={stored < 1}
          onClick={() => { const got = collectGold(); setMsg(got ? `+${fmt(got)}` : ''); setTimeout(() => setMsg(''), 2000); }}
          className="tabular flex h-full items-center gap-1 rounded-full bg-[#8e2a22] px-2.5 font-bold text-[#fff4d6] disabled:opacity-40"
        >
          <Coins size={11} /> {msg ? <b className="text-emerald-200">{msg}</b> : `징수 ${fmt(stored)}`}
        </button>
      </div>
    );
  }
  return (
    <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#1b1713]/85 px-3 py-1.5 text-xs text-[#E7DCC8]">
      <span className="min-w-0 font-bold">
        🏯 {list.length}성 · <b className="tabular text-amber-300">{fmt(income)}</b>/시
        {threatN > 0 && <b className="ml-2 text-red-300">군주 위협 {threatN}</b>}
        {msg && <b className="ml-2 text-emerald-300">{msg}</b>}
      </span>
      <button
        type="button"
        disabled={stored < 1}
        onClick={() => { const got = collectGold(); setMsg(got ? `+${fmt(got)}금 징수` : ''); setTimeout(() => setMsg(''), 2500); }}
        className="tabular flex shrink-0 items-center gap-1 rounded-md bg-[#8e2a22] px-2.5 py-1 font-bold text-[#fff4d6] disabled:opacity-40"
      >
        <Coins size={12} /> 징수 {fmt(stored)}
      </button>
    </div>
  );
}

/** 점령한 성의 내정 */
export function DomainPanel({ stageId, castle, now, gold, squads }: {
  stageId: string; castle: Castle; now: number; gold: number; squads: SquadRow[];
}) {
  const collectGold = useGame((s) => s.collectGold);
  const upgradeCastle = useGame((s) => s.upgradeCastle);
  const setGarrison = useGame((s) => s.setGarrison);
  const idx = stageIndex(stageId);
  const income = incomePerHour(idx, castle);
  const stored = accrued(idx, castle, now);
  const cap = Math.floor(income * STORE_CAP_HOURS);
  const max = castle.level >= CASTLE_MAX_LEVEL;
  const cost = upgradeCost(idx, castle.level);
  const guard = castle.garrison?.commander;
  const free = squads.filter((s) => !s.busy);

  return (
    <div className="mt-3 text-xs">
      <div className="mb-1 flex items-baseline justify-between">
        <b className="font-serif text-[13px]">內政 내정</b>
        <span className="tabular font-bold text-[#8e2a22]">Lv.{castle.level} / {CASTLE_MAX_LEVEL}</span>
      </div>
      <div className="rounded-md bg-[#8a6230]/10 p-2 ring-1 ring-[#8a6230]/30">
        <div className="flex items-center justify-between gap-2">
          <span>수입 <b className="tabular">+{fmt(income)}</b>금/시{castle.garrison && <span className="ml-1 text-[10px] text-[#276347]">수비 +25%</span>}</span>
          <button
            type="button"
            disabled={stored < 1}
            onClick={() => collectGold(stageId)}
            className="tabular flex items-center gap-1 rounded-md bg-[#8e2a22] px-2 py-1 font-bold text-[#fff4d6] disabled:opacity-40"
          >
            <Coins size={12} /> 징수 {fmt(stored)}
          </button>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1b1713]/70">
          <div className="h-full rounded-full bg-[#c4a15a]" style={{ width: `${cap ? Math.min(100, (stored / cap) * 100) : 0}%` }} />
        </div>
        <div className="mt-0.5 text-[10px] opacity-60">상한 {fmt(cap)} · {STORE_CAP_HOURS}시간</div>

        <button
          type="button"
          disabled={max || gold + stored < cost}
          onClick={() => upgradeCastle(stageId)}
          className="mt-2 w-full rounded-md bg-[#8a6230]/20 py-1.5 font-bold ring-1 ring-[#8a6230]/40 disabled:opacity-40"
        >
          {max ? '내정 최대' : `투자 Lv.${castle.level + 1} · ${fmt(cost)}`}
        </button>
      </div>

      <div className="mt-2">
        <div className="mb-1 font-bold">수비 <span className="text-[10px] font-normal opacity-60">+25% · 출정 잠금</span></div>
        <div className="flex flex-wrap gap-1">
          {castle.garrison && (
            <button type="button" onClick={() => setGarrison(stageId, null)} className="rounded-md bg-[#8e2a22]/15 px-2 py-1 font-bold ring-1 ring-[#8e2a22]/50">
              {`${squads.find((s) => s.p.members[0]?.def.id === guard)?.p.name.replace(' 부대', '') ?? '수비'} 해제`}
            </button>
          )}
          {!castle.garrison && free.length === 0 && <span className="opacity-60">부대 없음</span>}
          {!castle.garrison && free.map((s) => (
            <button key={s.idx} type="button" onClick={() => setGarrison(stageId, s.idx)}
              className={cn('rounded-md bg-[#8a6230]/10 px-2 py-1 font-bold ring-1 ring-[#8a6230]/40')}>
              {s.idx + 1}부대 · {s.p.name.replace(' 부대', '')} 배치
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
