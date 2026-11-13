// 부대 편성 — 상대(원정 스테이지 · 천하 토벌전 · 모의전)를 골라 상성 힌트를 보며 편성
import { useMemo, useState } from 'react';
import { FormationEditor } from '../components/FormationEditor';
import { TroopAdviceBox } from '../components/Matchup';
import { PageHero } from '../components/PageHero';
import { Btn, Modal } from '../components/ui';
import { isUnlocked, STAGES, STAGE_MAP } from '../data/stages';
import { practiceOpponent } from '../engine/aiArmy';
import { conquestFloor } from '../engine/conquest';
import { deployedAvgLevel, enemyUnitsToProfiles } from '../engine/profiles';
import { playerProfiles, useGame } from '../store/gameStore';

export default function Formation() {
  const roster = useGame((s) => s.roster);
  const formation = useGame((s) => s.formation);
  const cleared = useGame((s) => s.cleared);
  const focusStage = useGame((s) => s.focusStage);
  const setFocusStage = useGame((s) => s.setFocusStage);
  const conquestBest = useGame((s) => s.conquestBest);
  const practice = useGame((s) => s.practice);
  const conquestOpen = (cleared['4-3'] ?? 0) > 0;

  // 상대: 마지막으로 본 상대(원정 스테이지 · 토벌전 · 모의전), 없으면 아직 못 깬 첫 스테이지
  const unlockedStages = STAGES.filter((st) => isUnlocked(st.id, cleared));
  const fallback = (unlockedStages.find((st) => !cleared[st.id]) ?? unlockedStages[unlockedStages.length - 1]).id;
  const key =
    focusStage === 'practice' ? 'practice'
      : focusStage === 'conquest' && conquestOpen ? 'conquest'
        : focusStage && STAGE_MAP[focusStage] && isUnlocked(focusStage, cleared) ? focusStage
          : fallback;

  const avgLevel = useMemo(() => deployedAvgLevel(formation, roster), [formation, roster]);
  const practiceOpp = useMemo(
    () => (key === 'practice' ? practiceOpponent(practice.theme, practice.diff, practice.seed, avgLevel) : null),
    [key, practice, avgLevel],
  );
  const enemyUnits = useMemo(
    () => (key === 'practice' ? practiceOpp!.enemies : key === 'conquest' ? conquestFloor(conquestBest + 1).enemies : STAGE_MAP[key].enemies),
    [key, practiceOpp, conquestBest],
  );
  const enemy = useMemo(() => enemyUnitsToProfiles(enemyUnits), [enemyUnits]);
  const [help, setHelp] = useState(false);

  return (
    <div className="space-y-5">
      <PageHero image="scene-formation.webp" title="부대 편성">
        <p className="mt-1 text-xs text-stone-300">
          같은 세력·병과·인연을 맞추면 전투력과 연쇄가 오릅니다.
          <button type="button" className="ml-2 font-bold text-amber-200 underline-offset-2 hover:underline" onClick={() => setHelp(true)}>칸 설명</button>
        </p>
      </PageHero>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-stone-400">
          상대
          <select value={key} onChange={(e) => setFocusStage(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-200 sm:flex-none">
            {conquestOpen && <option value="conquest">🏔 천하 토벌전 {conquestBest + 1}층</option>}
            <option value="practice">🎯 모의전 상대 ({practiceOpp?.label ?? '도전 탭 설정'})</option>
            <optgroup label="천하 원정">
              {unlockedStages.map((st) => <option key={st.id} value={st.id}>{st.id} {st.title}{cleared[st.id] ? ' ✓' : ''}</option>)}
            </optgroup>
          </select>
        </label>
        <TroopAdviceBox enemy={enemy} mine={playerProfiles(formation, roster)} compact />
      </div>

      <FormationEditor enemy={enemy} />

      {help && (
        <Modal onClose={() => setHelp(false)}>
          <h3 className="font-serif text-lg font-black">부대 6칸</h3>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-stone-300">
            <li>주장 — 병과와 주 전법을 정합니다.</li>
            <li>부장 2명 — 연쇄 전법 1단·2단.</li>
            <li>참모 — 연쇄 3단. 발동률이 오릅니다.</li>
            <li>보좌 2명 — 전법은 없고, 능력 일부와 시너지 인원에 포함됩니다.</li>
          </ul>
          <p className="mt-3 text-xs text-stone-400">칸을 고른 뒤 아래 목록에서 장수를 누르면 배치됩니다.</p>
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setHelp(false)}>닫기</Btn>
        </Modal>
      )}
    </div>
  );
}
