// 부대 진형 선택 — 카드 헤더용 컴팩트 버튼 + 모달 (구성 맞춤 달성 표시)
import { useState } from 'react';
import { FORMATIONS, formationOf, type FormationId } from '../data/formations';
import { formationCondHint, formationCondStatus } from '../engine/formationBonus';
import type { SynergyResult } from '../engine/synergy';
import type { UnitMember } from '../engine/unit';
import { Modal, cn } from './ui';

export function FormationPicker({
  value,
  onChange,
  compact,
  members,
  synergy,
}: {
  value: string | undefined;
  onChange: (id: FormationId) => void;
  compact?: boolean;
  members?: (UnitMember | null)[];
  synergy?: SynergyResult;
}) {
  const [open, setOpen] = useState(false);
  const cur = formationOf(value as FormationId);
  const curCond = members
    ? formationCondStatus(cur.id, members, synergy)
    : { hint: '', active: false, label: '' };

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`${cur.hanja} ${cur.name}`}
          className={cn(
            'shrink-0 rounded-md border border-[#E2B866]/45 bg-[#1b1713]/80 font-bold text-[#2C221E] hover:border-[#E2B866]',
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
          )}
        >
          {cur.name}
        </button>
        {curCond.hint && (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-bold',
              curCond.active
                ? 'bg-emerald-950/70 text-emerald-300 ring-1 ring-emerald-500/50'
                : 'bg-stone-800/80 text-stone-500',
            )}
            title={formationCondHint(cur)}
          >
            {curCond.hint}{curCond.active ? ' ✓' : ''}
          </span>
        )}
      </div>
      {open && (
        <Modal onClose={() => setOpen(false)} ink>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg font-black">진형 선택</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-400">닫기</button>
          </div>
          <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
            {FORMATIONS.map((f) => {
              const on = f.id === cur.id;
              const cond = members
                ? formationCondStatus(f.id, members, synergy)
                : { hint: '', active: false, label: '' };
              const condLine = formationCondHint(f);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(f.id); setOpen(false); }}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                      on ? 'border-[#E2B866] bg-[#E2B866]/15' : 'border-stone-700 bg-stone-950/50 hover:border-stone-500',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-base font-black text-[#2C221E]">
                        {f.name} <span className="text-xs font-bold text-[#E2B866]">{f.hanja}</span>
                      </span>
                      {on && <span className="text-[10px] font-bold text-amber-300">선택</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-400">{f.desc}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 text-stone-300">주장 {pct(f.scale.commander)}</span>
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 text-stone-300">부장 {pct(f.scale.vice)}</span>
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 text-stone-300">보좌 {pct(f.scale.aide)}</span>
                    </div>
                    {(f.buffs.length > 0 || f.debuffs.length > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] font-bold">
                        {f.buffs.map((b) => (
                          <span key={b} className="rounded bg-emerald-950/60 px-1.5 py-0.5 text-emerald-300 ring-1 ring-emerald-600/40">{b}</span>
                        ))}
                        {f.debuffs.map((d) => (
                          <span key={d} className="rounded bg-red-950/60 px-1.5 py-0.5 text-red-300 ring-1 ring-red-700/40">{d}</span>
                        ))}
                      </div>
                    )}
                    {condLine && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="text-stone-400">{condLine}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5',
                            cond.active
                              ? 'bg-[#E2B866]/20 text-[#F0D58A] ring-1 ring-[#E2B866]/60'
                              : 'bg-stone-800 text-stone-500',
                          )}
                        >
                          {cond.hint || '조건'}{cond.active ? ' 달성 ✓' : ' 미달성'}
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
