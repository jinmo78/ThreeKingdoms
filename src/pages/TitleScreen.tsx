import { Link2, Play, RotateCcw, Swords, Users } from 'lucide-react';
import { useState } from 'react';
import { BannerEmblem } from '../components/BannerEmblem';
import { GeneralToken } from '../components/General';
import { Btn } from '../components/ui';
import { GAME_SUBTITLE, GAME_TAGLINE, GAME_TITLE } from '../config';
import { getGeneral } from '../data/generals';
import { useGame } from '../store/gameStore';

const SHOWCASE = ['caocao', 'liubei', 'sunquan', 'lubu', 'zhugeliang'];

export default function TitleScreen() {
  const started = useGame((s) => s.started);
  const enter = useGame((s) => s.enter);
  const newGame = useGame((s) => s.newGame);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      {/* 배경: 붉은 원(낙조) + 산 실루엣 */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full opacity-60" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
        <circle cx="200" cy="120" r="70" fill="#7f1d1d" opacity="0.45" />
        <path d="M0 200 L0 140 L60 95 L110 130 L170 80 L230 125 L290 90 L350 130 L400 105 L400 200 Z" fill="#1c1917" />
        <path d="M0 200 L0 165 L80 135 L150 160 L220 128 L300 158 L400 138 L400 200 Z" fill="#0c0a09" />
      </svg>

      <div className="relative">
        <BannerEmblem animated className="mx-auto h-28 w-28 drop-shadow-[0_10px_30px_rgba(220,38,38,0.35)]" />
        <h1 className="mt-4 font-serif text-5xl font-black tracking-wide text-stone-50 sm:text-6xl">{GAME_TITLE}</h1>
        <div className="mt-2 font-serif text-lg tracking-[0.5em] text-red-300">{GAME_SUBTITLE}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-stone-500">{GAME_TAGLINE}</div>

        <div className="mt-8 flex justify-center gap-2">
          {SHOWCASE.map((id, i) => (
            <div key={id} className="animate-pop-in" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
              <GeneralToken def={getGeneral(id)} size="md" />
            </div>
          ))}
        </div>

        <ul className="mx-auto mt-8 grid max-w-md gap-2 text-left text-sm text-stone-400">
          <li className="flex items-center gap-2"><Users size={16} className="text-red-400" /> 장수를 등용하고 주장·부장·참모로 부대를 편성</li>
          <li className="flex items-center gap-2"><Link2 size={16} className="text-amber-400" /> 세력·병과·인연을 맞춰 시너지를 완성</li>
          <li className="flex items-center gap-2"><Swords size={16} className="text-sky-400" /> 자동 전투에서 터지는 연쇄 전법으로 승리</li>
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3">
          {started ? (
            <>
              <Btn size="lg" onClick={enter} className="w-56"><Play size={18} /> 이어하기</Btn>
              {confirm ? (
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  저장된 진행이 모두 지워집니다.
                  <Btn size="sm" variant="outline" onClick={newGame}>새로 시작</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)}>취소</Btn>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300">
                  <RotateCcw size={12} /> 처음부터 다시 하기
                </button>
              )}
            </>
          ) : (
            <Btn size="lg" onClick={newGame} className="w-56"><Play size={18} /> 출사표 던지기</Btn>
          )}
        </div>
        <p className="mt-6 text-[11px] text-stone-600">진행 상황은 이 브라우저에 자동 저장됩니다.</p>
      </div>
    </div>
  );
}
