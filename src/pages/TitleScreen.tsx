import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { BannerEmblem } from '../components/BannerEmblem';
import { CloudPanel, TitleButton, TitleIcon } from '../components/CloudAccount';
import { InstallPrompt } from '../components/InstallPrompt';
import { GeneralToken } from '../components/General';
import { ReloadButton, useLandscape } from '../components/ui';
import { useCloud } from '../cloud/account';
import { GAME_SUBTITLE, GAME_TAGLINE, GAME_TITLE } from '../config';
import { getGeneral } from '../data/generals';
import { useGame } from '../store/gameStore';

const SHOWCASE = ['caocao', 'liubei', 'sunquan', 'lubu', 'zhugeliang'];
const TITLE_ART = `${import.meta.env.BASE_URL}title.webp`;

export default function TitleScreen() {
  const started = useGame((s) => s.started);
  const enter = useGame((s) => s.enter);
  const newGame = useGame((s) => s.newGame);
  const configured = useCloud((s) => s.configured);
  const phase = useCloud((s) => s.phase);
  const cloudUser = useCloud((s) => s.user);
  const conflict = useCloud((s) => s.conflict);
  const [confirm, setConfirm] = useState(false);
  const land = useLandscape();
  const waitingCloud = configured && !started && (phase === 'booting' || phase === 'syncing');

  return (
    <div className="relative h-dvh min-h-dvh overflow-hidden bg-[#181310]">
      {/* 원본이 세로 720px라 넓은 PC에서 통째로 늘리면 흐려진다. 옆은 흐린 배경, 가운데만 원본 폭. */}
      <img src={TITLE_ART} alt="" aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-50 blur-3xl sm:block" />
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-1">
        <ReloadButton className="text-[#F5E6C8]/85 hover:bg-white/10 hover:text-[#F5E6C8]" />
      </div>

      <div className="relative mx-auto h-full min-h-0 w-full max-w-[720px] overflow-hidden">
      <img
        src={TITLE_ART}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />

      <div className="relative flex h-full min-h-0 flex-col items-center px-6 pb-8 pt-8 text-center sm:pt-12 land:justify-between land:px-4 land:py-3">
        <div className="flex flex-col items-center">
        <BannerEmblem animated className="h-16 w-16 drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)] land:h-10 land:w-10" />
        <h1 className="mt-3 font-serif text-5xl font-black tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-6xl land:mt-1 land:text-4xl">{GAME_TITLE}</h1>
        <div className="mt-2 font-serif text-lg tracking-[0.5em] text-red-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] land:mt-0.5 land:text-sm land:tracking-[0.35em]">{GAME_SUBTITLE}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] land:hidden">{GAME_TAGLINE}</div>
        </div>

        <div className="flex-1 land:hidden" />

        <div className="mt-4 flex justify-center gap-2 land:mt-0">
          {SHOWCASE.map((id, i) => (
            <div key={id} className="animate-pop-in" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
              <GeneralToken def={getGeneral(id)} size={land ? 'sm' : 'md'} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 land:mt-0 land:gap-2">
          {conflict ? <CloudPanel /> : (
            <>
              {waitingCloud ? null : started ? (
                <TitleButton color="red" icon={Play} className="land:w-44 land:py-2 land:text-sm" onClick={enter}>{cloudUser && !cloudUser.anonymous ? '입장' : '이어하기'}</TitleButton>
              ) : (
                <TitleButton color="red" icon={Play} className="land:w-44 land:py-2 land:text-sm" onClick={newGame}>출사</TitleButton>
              )}
              <div className="flex max-w-full flex-wrap justify-center gap-2">
                <CloudPanel />
                <InstallPrompt />
                {started && (confirm ? (
                  <>
                    <TitleIcon label="확인" title="기록을 지우고 다시 시작" onClick={newGame}><RotateCcw size={16} /></TitleIcon>
                    <TitleIcon label="취소" onClick={() => setConfirm(false)}><span className="text-base leading-none">×</span></TitleIcon>
                  </>
                ) : (
                  <TitleIcon label="초기화" title="계정 초기화" onClick={() => setConfirm(true)}><RotateCcw size={16} /></TitleIcon>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
