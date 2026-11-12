// 부대 편성 — 상대(원정 스테이지 · 천하 토벌전 · 모의전)를 골라 상성 힌트를 보며 편성
import { useMemo } from 'react';
import { FormationEditor } from '../components/FormationEditor';
import { TroopAdviceBox } from '../components/Matchup';
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-black">부대 편성</h2>
        <p className="text-xs text-stone-500">
          칸을 고른 뒤 아래에서 장수를 탭하세요. 같은 <b className="text-sky-300">세력</b>·<b className="text-orange-300">병과</b>·
          <b className="text-amber-300">인연</b>을 맞추면 전투력과 <b className="text-red-300">연쇄 전법</b> 확률이 올라갑니다.
        </p>
        <p className="mt-0.5 text-[11px] text-stone-500">
          부대 6칸 — 주장(병과·주 전법) · 부장×2(연쇄 1·2단) · 참모(연쇄 3단, 발동률↑) · 보좌×2(능력 일부 + 시너지 인원)
        </p>
      </div>

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
    </div>
  );
}
