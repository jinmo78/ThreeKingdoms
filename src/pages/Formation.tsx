// 부대 편성 — 상대(원정 스테이지 · 천하 토벌전 · 모의전)를 골라 상성 힌트를 보며 편성
import { useMemo } from 'react';
import { Desk } from '../components/Desk';
import { FormationEditor } from '../components/FormationEditor';
import { TroopAdviceBox } from '../components/Matchup';
import { useLandscape } from '../components/ui';
import { isUnlocked, STAGES, STAGE_MAP } from '../data/stages';
import { practiceOpponent } from '../engine/aiArmy';
import { conquestFloor } from '../engine/conquest';
import { deployedAvgLevel, enemyUnitsToProfiles } from '../engine/profiles';
import { playerProfiles, useGame } from '../store/gameStore';

export default function Formation() {
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const formation = useGame((s) => s.formation);
  const cleared = useGame((s) => s.cleared);
  const fought = useGame((s) => s.fought);
  const focusStage = useGame((s) => s.focusStage);
  const setFocusStage = useGame((s) => s.setFocusStage);
  const conquestBest = useGame((s) => s.conquestBest);
  const conquestFailFloor = useGame((s) => s.conquestFailFloor);
  const practice = useGame((s) => s.practice);
  const conquestOpen = (cleared['4-3'] ?? 0) > 0;

  // 상대: 마지막으로 본 상대(원정 스테이지 · 토벌전 · 모의전), 없으면 아직 못 깬 첫 스테이지
  const unlockedStages = STAGES.filter((st) => isUnlocked(st.id, cleared));
  const fallback = (unlockedStages.find((st) => !cleared[st.id]) ?? unlockedStages[unlockedStages.length - 1] ?? STAGES[0]).id;
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
  const land = useLandscape();

  const opponent = (
    <label className="flex items-center gap-2 text-xs text-stone-400">
      상대
      <select value={key} onChange={(e) => setFocusStage(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-200">
        {conquestOpen && <option value="conquest">🏔 천하 토벌전 {conquestBest + 1}층</option>}
        <option value="practice">🎯 모의전 상대 ({practiceOpp?.label ?? '도전 탭 설정'})</option>
        <optgroup label="천하 원정">
          {unlockedStages.map((st) => <option key={st.id} value={st.id}>{st.id} {st.title}{cleared[st.id] ? ' ✓' : ''}</option>)}
        </optgroup>
      </select>
    </label>
  );

  const editor = (
    <FormationEditor
        enemy={enemy}
        counter={{
          enemies: enemyUnits,
          unlocked: key === 'practice' || (key === 'conquest' ? conquestFailFloor === conquestBest + 1 : (fought[key] ?? 0) > 0),
          lockedNote: key === 'conquest' ? '이 층에서 1회 패배 후 개방' : key === 'practice' ? undefined : '첫 전투 후 개방',
        }}
      />
  );

  if (land) {
    return (
      <div className="space-y-1.5">
        {opponent}
        {editor}
      </div>
    );
  }

  return (
    <>
      <Desk
        title="부대 편성"
        hanja="部隊編成"
        seal="編制"
        scrollTitle="상성"
        scroll={(
          <div className="space-y-3">
            {opponent}
            <TroopAdviceBox enemy={enemy} mine={playerProfiles(formation, roster, gear)} compact />
          </div>
        )}
      >
        {editor}
      </Desk>
    </>
  );
}
