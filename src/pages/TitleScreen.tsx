import { Link2, Play, RotateCcw, Swords, Users } from 'lucide-react';
import { useState } from 'react';
import { BannerEmblem } from '../components/BannerEmblem';
import { CloudPanel } from '../components/CloudAccount';
import { GeneralToken } from '../components/General';
import { Btn, ThemeToggle } from '../components/ui';
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
  const waitingCloud = configured && !started && (phase === 'booting' || phase === 'syncing');

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#140e0c]">
      {/* 원본이 세로 720px라 넓은 PC에서 통째로 늘리면 흐려진다. 옆은 흐린 배경, 가운데만 원본 폭. */}
      <img src={TITLE_ART} alt="" aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-40 blur-3xl sm:block" />
      <ThemeToggle className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10" />

      <div className="relative mx-auto min-h-dvh w-full max-w-[720px] overflow-hidden">
      <img
        src={TITLE_ART}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/45" />

      <div className="relative flex min-h-dvh flex-col items-center px-6 pb-8 pt-8 text-center sm:pt-12">
        <BannerEmblem animated className="h-16 w-16 drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)]" />
        <h1 className="mt-3 font-serif text-5xl font-black tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-6xl">{GAME_TITLE}</h1>
        <div className="mt-2 font-serif text-lg tracking-[0.5em] text-red-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">{GAME_SUBTITLE}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">{GAME_TAGLINE}</div>

        <div className="flex-1" />

        <div className="flex justify-center gap-2">
          {SHOWCASE.map((id, i) => (
            <div key={id} className="animate-pop-in" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
              <GeneralToken def={getGeneral(id)} size="md" />
            </div>
          ))}
        </div>

        <ul className="mx-auto mt-6 grid w-full max-w-md gap-2 break-keep rounded-2xl bg-stone-950/70 px-4 py-3 text-left text-sm text-stone-300">
          <li className="flex items-center gap-2"><Users size={16} className="shrink-0 text-red-300" /> 장수를 등용하고 주장·부장·참모·보좌 6인 부대를 편성</li>
          <li className="flex items-center gap-2"><Link2 size={16} className="shrink-0 text-amber-300" /> 세력·병과·인연을 맞춰 시너지를 완성</li>
          <li className="flex items-center gap-2"><Swords size={16} className="shrink-0 text-sky-300" /> 자동 전투에서 터지는 연쇄 전법으로 승리</li>
        </ul>

        <div className="mt-6 flex flex-col items-center gap-3">
          {conflict ? null : waitingCloud ? (
            <p className="text-sm text-stone-200">다른 기기의 기록을 확인하고 있습니다…</p>
          ) : started ? (
            <>
              <Btn size="lg" onClick={enter} className="w-56"><Play size={18} /> {cloudUser && !cloudUser.anonymous ? '입장' : '이어하기'}</Btn>
              {confirm ? (
                <div className="flex items-center gap-2 text-xs text-stone-300">
                  {cloudUser ? '이 기기와 클라우드의 진행이 모두 지워집니다.' : '저장된 진행이 모두 지워집니다.'}
                  <Btn size="sm" variant="outline" onClick={newGame}>새로 시작</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)}>취소</Btn>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200">
                  <RotateCcw size={12} /> 처음부터 다시 하기
                </button>
              )}
            </>
          ) : (
            <Btn size="lg" onClick={newGame} className="w-56"><Play size={18} /> 출사표 던지기</Btn>
          )}
        </div>
        <CloudPanel />
        <p className="mt-4 text-[11px] text-stone-500">진행 상황은 이 브라우저에 자동 저장됩니다.</p>
      </div>
      </div>
    </div>
  );
}
