// 장수록(도감) + 인연 목록
import { BookOpen, Link2 } from 'lucide-react';
import { useState } from 'react';
import { GeneralCard, GeneralDetail, GeneralToken, RarityBadge } from '../components/General';
import { PageHero } from '../components/PageHero';
import { Btn, cn, Modal } from '../components/ui';
import { BONDS, bondMembers, type BondDef } from '../data/bonds';
import { RECRUITABLE } from '../data/generals';
import { FACTION, FACTIONS } from '../data/meta';
import { bonusText } from '../engine/synergy';
import { shownRarity } from '../engine/unit';
import { useGame } from '../store/gameStore';
import type { GeneralDef, OwnedGeneral } from '../types';

export default function Roster() {
  const roster = useGame((s) => s.roster);
  const [tab, setTab] = useState<'generals' | 'bonds'>('generals');
  const [detail, setDetail] = useState<GeneralDef | null>(null);
  const [bondId, setBondId] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const openBond = BONDS.find((b) => b.id === bondId);

  return (
    <div className="space-y-5">
      <PageHero
        image="scene-roster.webp"
        title="장수록"
        vivid
        aside={
          <div className="flex shrink-0 gap-1 rounded-xl bg-stone-950/80 p-1">
            <TabBtn active={tab === 'generals'} onClick={() => setTab('generals')}><BookOpen size={14} /> 장수</TabBtn>
            <TabBtn active={tab === 'bonds'} onClick={() => setTab('bonds')}><Link2 size={14} /> 인연</TabBtn>
          </div>
        }
      >
        <p className="mt-1 hidden text-xs text-stone-300 sm:block">등용한 장수와 인연 조합을 확인하세요.</p>
      </PageHero>

      {tab === 'generals' &&
        FACTIONS.map((f) => {
          const list = RECRUITABLE.filter((g) => g.faction === f);
          return (
            <section key={f}>
              <h3 className={cn('mb-2 font-serif text-lg font-black', FACTION[f].text)}>
                {FACTION[f].full} <span className="text-xs font-normal text-stone-500">{list.filter((g) => roster[g.id]).length}/{list.length}</span>
              </h3>
              <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:hidden">
                {list.map((g) => {
                  const rank = shownRarity(g.rarity, roster[g.id]?.promote);
                  return (
                    <button key={g.id} type="button" onClick={() => setDetail(g)} className="flex min-w-0 flex-col items-center gap-0.5">
                      <GeneralToken def={g} rarity={rank} size="fill" className="w-full" dim={!roster[g.id]} />
                      <RarityBadge rarity={rank} />
                      <span className={cn('w-full truncate text-[11px] font-bold', roster[g.id] ? 'text-stone-200' : 'text-stone-600')}>{g.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="hidden gap-2 sm:grid sm:grid-cols-5 lg:grid-cols-7">
                {list.map((g) => <GeneralCard key={g.id} def={g} owned={roster[g.id]} onClick={() => setDetail(g)} />)}
              </div>
            </section>
          );
        })}

      {tab === 'bonds' && (
        <>
          <div className="space-y-2 sm:hidden">
            {BONDS.map((b) => {
              const members = bondMembers(b.id);
              const ownedN = members.filter((g) => roster[g.id]).length;
              return (
                <button key={b.id} type="button" onClick={() => setBondId(b.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-2.5 text-left">
                  <span className="min-w-0">
                    <span className="block truncate font-serif font-black text-amber-200">{b.id}</span>
                    <span className="block truncate text-[11px] text-stone-500">{b.desc}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-stone-300">{ownedN}/{members.length}</span>
                </button>
              );
            })}
            <button type="button" onClick={() => setRules(true)}
              className="w-full rounded-xl border border-dashed border-stone-700 py-2.5 text-xs font-bold text-stone-300">
              기본 시너지 규칙
            </button>
          </div>
          <div className="hidden gap-3 sm:grid md:grid-cols-2">
            {BONDS.map((b) => <BondCard key={b.id} bond={b} roster={roster} onPick={setDetail} />)}
            <div className="rounded-2xl border border-dashed border-stone-700 p-3 text-xs text-stone-400 md:col-span-2">
              <RulesBody />
            </div>
          </div>
        </>
      )}

      {openBond && (
        <Modal onClose={() => setBondId(null)}>
          <BondCard bond={openBond} roster={roster} onPick={setDetail} />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setBondId(null)}>닫기</Btn>
        </Modal>
      )}

      {rules && (
        <Modal onClose={() => setRules(false)}>
          <RulesBody />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setRules(false)}>닫기</Btn>
        </Modal>
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

function BondCard({ bond, roster, onPick }: {
  bond: BondDef; roster: Record<string, OwnedGeneral>; onPick: (g: GeneralDef) => void;
}) {
  const members = bondMembers(bond.id);
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-serif text-base font-black text-amber-200">{bond.id}</span>
        <span className="text-right text-[11px] text-stone-500">{bond.desc}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {members.map((g) => (
          <button key={g.id} type="button" onClick={() => onPick(g)} className="flex flex-col items-center gap-0.5">
            <GeneralToken def={g} rarity={shownRarity(g.rarity, roster[g.id]?.promote)} size="sm" dim={!roster[g.id]} />
            <span className={cn('text-[10px]', roster[g.id] ? 'text-stone-300' : 'text-stone-600')}>{g.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 text-[11px]">
        {bond.tiers.map((t) => (
          <div key={t.count} className="flex gap-2 text-stone-400">
            <span className="w-10 font-bold text-stone-300">{t.count}명</span>
            {bonusText(t.power, t.chain)}
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesBody() {
  return (
    <>
      <div className="mb-1 font-bold text-stone-300">기본 시너지</div>
      <ul className="list-inside list-disc space-y-0.5 text-xs text-stone-400">
        <li>부대 6칸 — 주장 · 부장×2 · 참모 · 보좌×2. 보좌는 전법이 없지만 능력 일부와 시너지 인원수에 포함</li>
        <li>세력 결속 — 같은 세력 3명: 전투력 +5% · 연쇄 +4% / 4명: +10% · +8% / 6명: +18% · +15%</li>
        <li>병과 통일 — 주장과 같은 병과 3명: 전투력 +5% / 4명: +9% · 연쇄 +5% / 6명: +15% · +10%</li>
        <li>명참모 — 참모의 기본 지력 90 이상: 연쇄 +10%</li>
        <li>연쇄 — 주장 전법 발동 후 부장1 → 부장2 → 참모 순으로 최대 3단. 기본 15%(최대 85%), 단계마다 확률 ×0.6</li>
        <li>병과 상성 — 🐎기병 &gt; 🏹궁병 &gt; 🛡️보병 &gt; 🐎기병 (우위 ×1.25, 열세 ×0.8)</li>
      </ul>
    </>
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
