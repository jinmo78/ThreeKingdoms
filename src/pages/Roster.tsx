// 장수록(도감) + 인연 목록
import { BookOpen, Link2 } from 'lucide-react';
import { useState } from 'react';
import { GeneralCard, GeneralDetail, GeneralToken } from '../components/General';
import { Btn, cn, Modal } from '../components/ui';
import { BONDS, bondMembers } from '../data/bonds';
import { RECRUITABLE } from '../data/generals';
import { FACTION, FACTIONS } from '../data/meta';
import { bonusText } from '../engine/synergy';
import { useGame } from '../store/gameStore';
import type { GeneralDef } from '../types';

export default function Roster() {
  const roster = useGame((s) => s.roster);
  const [tab, setTab] = useState<'generals' | 'bonds'>('generals');
  const [detail, setDetail] = useState<GeneralDef | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-black">장수록</h2>
          <p className="text-xs text-stone-500">등용한 장수와 인연 조합을 확인하세요.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-stone-900 p-1">
          <TabBtn active={tab === 'generals'} onClick={() => setTab('generals')}><BookOpen size={14} /> 장수</TabBtn>
          <TabBtn active={tab === 'bonds'} onClick={() => setTab('bonds')}><Link2 size={14} /> 인연</TabBtn>
        </div>
      </div>

      {tab === 'generals' &&
        FACTIONS.map((f) => {
          const list = RECRUITABLE.filter((g) => g.faction === f);
          return (
            <section key={f}>
              <h3 className={cn('mb-2 font-serif text-lg font-black', FACTION[f].text)}>
                {FACTION[f].full} <span className="text-xs font-normal text-stone-500">{list.filter((g) => roster[g.id]).length}/{list.length}</span>
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                {list.map((g) => <GeneralCard key={g.id} def={g} owned={roster[g.id]} onClick={() => setDetail(g)} />)}
              </div>
            </section>
          );
        })}

      {tab === 'bonds' && (
        <div className="grid gap-3 md:grid-cols-2">
          {BONDS.map((b) => {
            const members = bondMembers(b.id);
            return (
              <div key={b.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-base font-black text-amber-200">{b.id}</span>
                  <span className="text-[11px] text-stone-500">{b.desc}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {members.map((g) => (
                    <button key={g.id} type="button" onClick={() => setDetail(g)} className="flex flex-col items-center gap-0.5">
                      <GeneralToken def={g} size="sm" dim={!roster[g.id]} />
                      <span className={cn('text-[10px]', roster[g.id] ? 'text-stone-300' : 'text-stone-600')}>{g.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 space-y-0.5 text-[11px]">
                  {b.tiers.map((t) => (
                    <div key={t.count} className="flex gap-2 text-stone-400">
                      <span className="w-10 font-bold text-stone-300">{t.count}명</span>
                      {bonusText(t.power, t.chain)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="rounded-2xl border border-dashed border-stone-700 p-3 text-xs text-stone-400 md:col-span-2">
            <div className="mb-1 font-bold text-stone-300">기본 시너지</div>
            <ul className="list-inside list-disc space-y-0.5">
              <li>세력 결속 — 같은 세력 2명: 전투력 +6% · 연쇄 +5% / 3명: 전투력 +15% · 연쇄 +15%</li>
              <li>병과 통일 — 주장과 같은 병과 2명: 전투력 +5% / 3명: 전투력 +12% · 연쇄 +10%</li>
              <li>명참모 — 참모의 기본 지력 90 이상: 연쇄 +10%</li>
              <li>연쇄 기본 확률 15%, 최대 85%. 부장 연쇄 성공 후 참모 연쇄는 그 확률의 60%</li>
              <li>병과 상성 — 🐎기병 &gt; 🏹궁병 &gt; 🛡️보병 &gt; 🐎기병 (우위 ×1.25, 열세 ×0.8)</li>
            </ul>
          </div>
        </div>
      )}

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <GeneralDetail def={detail} owned={roster[detail.id]} />
          {!roster[detail.id] && <p className="mt-3 text-center text-xs text-stone-500">아직 등용하지 않은 장수입니다.</p>}
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setDetail(null)}>닫기</Btn>
        </Modal>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold', active ? 'bg-stone-700 text-stone-100' : 'text-stone-500')}>
      {children}
    </button>
  );
}
