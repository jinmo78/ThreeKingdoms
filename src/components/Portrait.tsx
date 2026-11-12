// 장수 상반신 초상 — 외부 이미지 없이 SVG 도형만으로 그린다
// 외형은 data/portraits.ts 의 appearanceOf()가 결정 (viewBox 0~100 기준 좌표)
import { useId } from 'react';
import { FACTION } from '../data/meta';
import { appearanceOf, isFemaleHead, type Appearance, type Skin } from '../data/portraits';
import type { Faction, GeneralDef } from '../types';

const SKIN: Record<Skin, string> = {
  light: '#f6d7ba',
  normal: '#e9bb90',
  tan: '#cf9562',
  dark: '#93603d',
  red: '#b8432f',
};
/** 세력별 갑주 기본색 */
const METAL: Record<Faction, string> = { wei: '#7d93b2', shu: '#7ea77c', wu: '#b67f7f', qun: '#b59d6c' };
/** 나이별 머리·수염 색: 젊음 · 중년 · 노년 */
const HAIR = ['#1c1917', '#231d1a', '#d6d3d1'];

/** hex 색을 검정(amt<0) 또는 흰색(amt>0) 쪽으로 섞기 */
function tone(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (t - v) * p).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export function Portrait({ def, className }: { def: GeneralDef; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const a = appearanceOf(def);
  const f = FACTION[def.faction].hex;
  const skin = SKIN[a.skin];
  const hair = a.hair ?? HAIR[a.age];
  const female = isFemaleHead(a.head);
  const rx = 14.5 * (a.wide ?? 1) * (female ? 0.94 : 1);
  const L = 50 - rx;
  const R = 50 + rx;
  const trim = def.rarity === 'SSR' ? '#fbbf24' : def.rarity === 'SR' ? '#e7e5e4' : '#a8a29e';
  const metal = METAL[def.faction];
  const gear = a.gear ?? (a.head === 'helmet' ? metal : f);

  const ctx: Ctx = { a, skin, hair, L, R, rx, gear, trim, metal, f, female, uid };

  return (
    <svg viewBox="0 0 100 100" className={className} aria-label={`${def.name} 초상`} role="img">
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={tone(f, 0.15)} />
          <stop offset="1" stopColor={tone(f, -0.75)} />
        </linearGradient>
        <radialGradient id={`lt${uid}`} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg${uid})`} />
      <rect width="100" height="100" fill={`url(#lt${uid})`} />

      <BackLayer c={ctx} />
      <BodyLayer c={ctx} />
      {/* 목 */}
      <path d="M44 58 L44 74 Q50 78 56 74 L56 58 Z" fill={tone(skin, -0.18)} />
      {/* 귀 */}
      {!female && (
        <>
          <ellipse cx={L + 0.5} cy="49" rx="2.6" ry="4.2" fill={tone(skin, -0.08)} />
          <ellipse cx={R - 0.5} cy="49" rx="2.6" ry="4.2" fill={tone(skin, -0.08)} />
        </>
      )}
      {/* 얼굴 */}
      <path
        d={`M${L} 45 C${L} 31 ${R} 31 ${R} 45 C${R} 56 ${50 + rx * 0.55} 65 50 66 C${50 - rx * 0.55} 65 ${L} 56 ${L} 45 Z`}
        fill={skin}
      />
      <Face c={ctx} />
      <BeardLayer c={ctx} />
      <HeadLayer c={ctx} />
      <Extras c={ctx} />
    </svg>
  );
}

interface Ctx {
  a: Appearance;
  skin: string;
  hair: string;
  L: number;
  R: number;
  rx: number;
  gear: string;
  trim: string;
  metal: string;
  f: string;
  female: boolean;
  uid: string;
}

/** 머리 뒤에 가려지는 것: 긴 머리, 깃털, 띠 자락 */
function BackLayer({ c }: { c: Ctx }) {
  const { a, hair, L, R, gear } = c;
  const plumes = a.extras?.includes('plumes');
  return (
    <g>
      {plumes && (
        <g fill="none" strokeLinecap="round">
          <path d="M46 24 C36 4 16 2 4 14" stroke="#92400e" strokeWidth="3.4" />
          <path d="M54 24 C64 4 84 2 96 14" stroke="#92400e" strokeWidth="3.4" />
          <path d="M46 24 C36 4 16 2 4 14" stroke="#fcd34d" strokeWidth="1.2" strokeDasharray="3 2" />
          <path d="M54 24 C64 4 84 2 96 14" stroke="#fcd34d" strokeWidth="1.2" strokeDasharray="3 2" />
        </g>
      )}
      {a.head === 'female' && (
        <path d={`M${L - 1} 40 C${L - 6} 60 ${L - 9} 78 ${L - 6} 92 L${R + 6} 92 C${R + 9} 78 ${R + 6} 60 ${R + 1} 40 Z`} fill={hair} />
      )}
      {a.head === 'female-war' && (
        <path d={`M${R - 2} 30 C${R + 14} 34 ${R + 12} 60 ${R + 18} 82 C${R + 8} 70 ${R + 4} 52 ${R - 4} 40 Z`} fill={hair} />
      )}
      {(a.head === 'band' || a.head === 'female-war') && (
        <path d={`M${R - 1} 37 C${R + 8} 40 ${R + 10} 48 ${R + 14} 56 L${R + 10} 57 C${R + 7} 50 ${R + 4} 44 ${R - 2} 41 Z`} fill={gear} />
      )}
      {a.head === 'scholar' && (
        <g fill={tone(gear === c.f ? '#292524' : gear, 0)}>
          <path d={`M${L + 1} 40 L${L - 5} 64 L${L - 1} 64 L${L + 4} 42 Z`} />
          <path d={`M${R - 1} 40 L${R + 5} 64 L${R + 1} 64 L${R - 4} 42 Z`} />
        </g>
      )}
      {a.head === 'tribal' && (
        <g strokeLinecap="round" fill="none" strokeWidth="4">
          <path d="M40 34 C34 20 28 12 22 6" stroke="#dc2626" />
          <path d="M46 32 C44 18 42 8 40 0" stroke="#facc15" />
          <path d="M54 32 C56 18 58 8 60 0" stroke="#16a34a" />
          <path d="M60 34 C66 20 72 12 78 6" stroke="#dc2626" />
        </g>
      )}
    </g>
  );
}

function BodyLayer({ c }: { c: Ctx }) {
  const { a, f, metal, trim } = c;
  const torso = 'M3 100 C5 85 17 75 34 72 L66 72 C83 75 95 85 97 100 Z';
  if (a.body === 'robe') {
    const robe = c.female ? tone(c.gear === c.f ? f : c.gear, -0.1) : tone(f, -0.25);
    return (
      <g>
        <path d={torso} fill={robe} />
        <path d="M3 100 C5 85 17 75 34 72 L40 72 C28 80 22 90 20 100 Z" fill={tone(robe, -0.2)} />
        <path d="M80 100 C78 90 72 80 60 72 L66 72 C83 75 95 85 97 100 Z" fill={tone(robe, -0.2)} />
        <path d="M42 72 L50 90 L58 72 Z" fill="#f5f5f4" />
        <path d="M42 71 L53 96" stroke={trim} strokeWidth="3" />
        <path d="M58 71 L47 89" stroke={trim} strokeWidth="3" />
      </g>
    );
  }
  const plate = tone(metal, -0.1);
  return (
    <g>
      <path d={torso} fill={tone(f, -0.35)} />
      {/* 가슴 갑옷 + 비늘 */}
      <path d="M33 77 L67 77 L70 100 L30 100 Z" fill={plate} />
      {[82, 87, 92, 97].map((y) => (
        <path key={y} d={`M${32 + (y - 77) * -0.1} ${y} Q50 ${y + 3} ${68 + (y - 77) * 0.1} ${y}`} stroke={tone(metal, -0.45)} strokeWidth="0.9" fill="none" />
      ))}
      <circle cx="50" cy="86" r="4.2" fill={trim} stroke={tone(trim, -0.4)} strokeWidth="0.8" />
      {/* 어깨 갑옷 */}
      {[20, 80].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="83" rx="15" ry="9.5" fill={metal} transform={`rotate(${x < 50 ? -18 : 18} ${x} 83)`} />
          <ellipse cx={x} cy="83" rx="15" ry="9.5" fill="none" stroke={trim} strokeWidth="1.2" transform={`rotate(${x < 50 ? -18 : 18} ${x} 83)`} />
          <path d={`M${x - 10} ${x < 50 ? 87 : 80} Q${x} 84 ${x + 10} ${x < 50 ? 80 : 87}`} stroke={tone(metal, -0.4)} strokeWidth="0.9" fill="none" />
        </g>
      ))}
      {/* 목 가리개 */}
      <path d="M37 75 Q50 83 63 75 L61 71 Q50 77 39 71 Z" fill={tone(metal, 0.15)} stroke={tone(metal, -0.4)} strokeWidth="0.6" />
    </g>
  );
}

function Face({ c }: { c: Ctx }) {
  const { a, skin, hair, female, rx } = c;
  const ex = 5.8 * Math.min(rx / 14.5, 1.12);
  const ink = '#1c1917';
  const browColor = a.age === 2 ? '#d6d3d1' : a.hair ?? '#1c1917';
  const line = tone(skin, -0.35);
  const eyeY = 47;
  return (
    <g>
      {/* 눈썹 */}
      {a.brow === 'fierce' && (
        <g stroke={browColor} strokeWidth="2.4" strokeLinecap="round">
          <path d={`M${50 - ex - 4.5} ${eyeY - 6} L${50 - ex + 3.2} ${eyeY - 3.6}`} />
          <path d={`M${50 + ex + 4.5} ${eyeY - 6} L${50 + ex - 3.2} ${eyeY - 3.6}`} />
        </g>
      )}
      {a.brow === 'calm' && (
        <g stroke={browColor} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d={`M${50 - ex - 4} ${eyeY - 4.2} Q${50 - ex} ${eyeY - 6.4} ${50 - ex + 3.4} ${eyeY - 4.6}`} />
          <path d={`M${50 + ex + 4} ${eyeY - 4.2} Q${50 + ex} ${eyeY - 6.4} ${50 + ex - 3.4} ${eyeY - 4.6}`} />
        </g>
      )}
      {a.brow === 'thin' && (
        <g stroke={female ? hair : browColor} strokeWidth="1.1" strokeLinecap="round" fill="none">
          <path d={`M${50 - ex - 4} ${eyeY - 4} Q${50 - ex} ${eyeY - 6.6} ${50 - ex + 3.5} ${eyeY - 5}`} />
          <path d={`M${50 + ex + 4} ${eyeY - 4} Q${50 + ex} ${eyeY - 6.6} ${50 + ex - 3.5} ${eyeY - 5}`} />
        </g>
      )}
      {/* 눈 */}
      {[-1, 1].map((s) => {
        const x = 50 + s * ex;
        return (
          <g key={s}>
            <ellipse cx={x} cy={eyeY} rx={female ? 2.6 : 2.4} ry={a.brow === 'fierce' ? 1.2 : female ? 1.8 : 1.5} fill="#fafaf9" />
            <circle cx={x} cy={eyeY + 0.1} r={female ? 1.5 : 1.25} fill={ink} />
            <circle cx={x + 0.5} cy={eyeY - 0.4} r="0.4" fill="#fff" />
            {female && <path d={`M${x - 2.8} ${eyeY - 0.8} Q${x} ${eyeY - 2.8} ${x + 2.9} ${eyeY - 1.2}`} stroke={ink} strokeWidth="0.9" fill="none" />}
          </g>
        );
      })}
      {/* 코 */}
      <path d="M50.4 48.5 L48.8 53.6 Q50 54.6 51.6 53.8" stroke={line} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* 입 */}
      {female ? (
        <path d="M47.6 58.6 Q50 60.4 52.4 58.6 Q50 59.2 47.6 58.6 Z" fill="#be123c" stroke="#be123c" strokeWidth="0.8" strokeLinejoin="round" />
      ) : (
        <path d="M47 59 Q50 60 53 59" stroke={tone(skin, -0.45)} strokeWidth="1" fill="none" strokeLinecap="round" />
      )}
      {female && (
        <>
          <ellipse cx={50 - ex - 1} cy="53" rx="2.6" ry="1.3" fill="#f43f5e" opacity="0.25" />
          <ellipse cx={50 + ex + 1} cy="53" rx="2.6" ry="1.3" fill="#f43f5e" opacity="0.25" />
        </>
      )}
      {/* 노년 주름 */}
      {a.age === 2 && (
        <g stroke={line} strokeWidth="0.6" fill="none" opacity="0.8">
          <path d={`M${50 - ex - 3.5} ${eyeY + 3} q2 1.2 4 0.4`} />
          <path d={`M${50 + ex + 3.5} ${eyeY + 3} q-2 1.2 -4 0.4`} />
          <path d="M45 54 q-1.2 2.6 -0.6 5" />
          <path d="M55 54 q1.2 2.6 0.6 5" />
        </g>
      )}
    </g>
  );
}

function BeardLayer({ c }: { c: Ctx }) {
  const { a, hair, L, R } = c;
  if (a.beard === 'none' || c.female) return null;
  const col = a.age === 2 ? '#e7e5e4' : hair;
  const stache = 'M43.5 57.6 Q46 54.4 50 55.6 Q54 54.4 56.5 57.6 Q54 56.6 50 57.4 Q46 56.6 43.5 57.6 Z';
  const jawOuter = (bottom: number) =>
    `M${L + 0.6} 49 Q${L + 1} ${bottom - 6} 50 ${bottom} Q${R - 1} ${bottom - 6} ${R - 0.6} 49`;
  const jawInner = `Q${R - 3} 59 56 61.4 Q50 63.4 44 61.4 Q${L + 3} 59 ${L + 0.6} 49 Z`;
  return (
    <g fill={col}>
      {a.beard === 'short' && <path d={`${jawOuter(69)} ${jawInner}`} />}
      {a.beard === 'full' && <path d={`${jawOuter(75)} ${jawInner}`} />}
      {a.beard === 'wild' && (
        <path
          d={`M${L + 0.6} 48 L${L - 2} 55 L${L + 1} 58 L${L - 1} 64 L${L + 4} 66 L${L + 3} 72 L44 71 L45 77 L50 73 L55 77 L56 71 L${R - 3} 72 L${R - 4} 66 L${R + 1} 64 L${R - 1} 58 L${R + 2} 55 L${R - 0.6} 48 ${jawInner}`}
        />
      )}
      {a.beard === 'long' && (
        <>
          <path d={`M${L + 0.6} 49 Q${L + 1} 64 44 72 Q46 90 50 99 Q54 90 56 72 Q${R - 1} 64 ${R - 0.6} 49 ${jawInner}`} />
          <g stroke={tone(col, a.age === 2 ? -0.2 : 0.25)} strokeWidth="0.5" fill="none" opacity="0.7">
            <path d="M48 70 Q48.6 84 50 96" />
            <path d="M52 70 Q51.4 84 50 96" />
          </g>
        </>
      )}
      {a.beard === 'goatee' && <path d="M46.5 61.5 Q50 63.5 53.5 61.5 Q52.5 68 50 74 Q47.5 68 46.5 61.5 Z" />}
      <path d={stache} />
      {a.beard === 'mustache' && <path d="M43.5 57.6 Q42 61 41.8 63.5 Q43.6 60.8 45 58.4 Z M56.5 57.6 Q58 61 58.2 63.5 Q56.4 60.8 55 58.4 Z" />}
    </g>
  );
}

function HeadLayer({ c }: { c: Ctx }) {
  const { a, hair, L, R, gear, trim } = c;
  // 머리카락 덮개 (이마선 위)
  const cap = (y = 37) =>
    `M${L - 0.8} 48 C${L - 1.5} 32 ${50 - c.rx * 0.6} 25.5 50 25.5 C${50 + c.rx * 0.6} 25.5 ${R + 1.5} 32 ${R + 0.8} 48 L${R - 1} 44 C${R - 3} ${y + 1} 56 ${y - 1} 50 ${y} C44 ${y - 1} ${L + 3} ${y + 1} ${L + 1} 44 Z`;
  const hairCap = <path d={cap()} fill={hair} />;
  const crown = gear === c.f ? '#292524' : gear;

  switch (a.head) {
    case 'helmet': {
      const dark = tone(gear, -0.35);
      return (
        <g>
          <path d={`M${L - 2.5} 43 C${L - 3} 18 ${R + 3} 18 ${R + 2.5} 43 Z`} fill={gear} />
          <path d={`M${L + 2} 26 C${L + 5} 22 ${R - 5} 22 ${R - 2} 26`} stroke={tone(gear, 0.35)} strokeWidth="1.2" fill="none" />
          <path d="M50 20.5 L50 37" stroke={dark} strokeWidth="1.2" />
          {/* 볼 가리개 */}
          <path d={`M${L - 2.5} 40 L${L + 2.5} 41 L${L + 1.5} 56 L${L - 3.5} 53 Z`} fill={tone(gear, -0.15)} />
          <path d={`M${R + 2.5} 40 L${R - 2.5} 41 L${R - 1.5} 56 L${R + 3.5} 53 Z`} fill={tone(gear, -0.15)} />
          {/* 차양 띠 */}
          <path d={`M${L - 3.5} 38 Q50 34.5 ${R + 3.5} 38 L${R + 3.5} 42.5 Q50 39 ${L - 3.5} 42.5 Z`} fill={dark} stroke={trim} strokeWidth="0.8" />
          <circle cx="50" cy="39" r="2" fill={trim} />
          {/* 꼭지 + 술 */}
          <path d="M47.5 21 L50 14 L52.5 21 Z" fill={trim} />
          <path d="M50 14 C44 8 42 4 44 1 C47 5 49 4 50 9 C51 4 53 5 56 1 C58 4 56 8 50 14 Z" fill="#dc2626" />
        </g>
      );
    }
    case 'hood':
      return (
        <g>
          <path d={`M${L - 2.5} 52 C${L - 4} 18 ${R + 4} 18 ${R + 2.5} 52 L${R - 0.5} 50 C${R - 1} 41 58 35.5 50 35.5 C42 35.5 ${L + 1} 41 ${L + 0.5} 50 Z`} fill={gear} />
          <path d={`M${L + 1} 30 Q50 24 ${R - 1} 30`} stroke={tone(gear, 0.25)} strokeWidth="1" fill="none" />
          <path d="M45 22 Q50 15 55 22 Q50 20 45 22 Z" fill={tone(gear, -0.3)} />
        </g>
      );
    case 'scholar': {
      const cloth = gear === c.f ? '#292524' : gear;
      return (
        <g>
          {hairCap}
          <path d={`M${L - 0.5} 41 C${L - 2} 26 ${L + 4} 17 50 16.5 C${R - 4} 17 ${R + 2} 26 ${R + 0.5} 41 C${R - 6} 36.5 ${L + 6} 36.5 ${L - 0.5} 41 Z`} fill={cloth} />
          {[44, 50, 56].map((x) => (
            <path key={x} d={`M${x} 18 Q${x + (x - 50) * 0.1} 28 ${x + (x - 50) * 0.15} 37.5`} stroke={tone(cloth, 0.25)} strokeWidth="0.7" fill="none" />
          ))}
        </g>
      );
    }
    case 'crown':
      return (
        <g>
          {hairCap}
          <circle cx="50" cy="26" r="5.5" fill={hair} />
          <path d="M42.5 30 L43.5 17 L56.5 17 L57.5 30 Z" fill={crown} stroke={trim} strokeWidth="0.8" />
          <path d="M43.5 21 L56.5 21 M43.5 25 L56.5 25" stroke={tone(crown, crown === '#292524' ? 0.35 : -0.35)} strokeWidth="0.7" />
          <path d="M34 23.5 L66 23.5" stroke={trim} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="66" cy="23.5" r="1.4" fill={trim} />
        </g>
      );
    case 'topknot':
      return (
        <g>
          {hairCap}
          <circle cx="50" cy="24" r="6" fill={hair} />
          <path d="M44 25 Q50 19.5 56 25" stroke={tone(hair, 0.2)} strokeWidth="0.6" fill="none" />
          <path d="M40 23.5 L60 21.5" stroke={trim} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    case 'band':
      return (
        <g>
          {hairCap}
          <circle cx="50" cy="25" r="5" fill={hair} />
          <path d={`M${L - 1.2} 43 Q50 32 ${R + 1.2} 43 L${R + 0.8} 38 Q50 27.5 ${L - 0.8} 38 Z`} fill={gear} />
          <path d={`M${L - 1} 40.5 Q50 30 ${R + 1} 40.5`} stroke={tone(gear, -0.3)} strokeWidth="0.6" fill="none" />
        </g>
      );
    case 'bald':
      return (
        <g>
          <path d={`M${L + 2} 32 Q50 24 ${R - 2} 32`} stroke="#fff" strokeOpacity="0.25" strokeWidth="2" fill="none" />
          <path d={`M${L - 0.4} 47 L${L - 0.2} 40 L${L + 2.4} 42 Z M${R + 0.4} 47 L${R + 0.2} 40 L${R - 2.4} 42 Z`} fill={hair} />
        </g>
      );
    case 'taoist':
      return (
        <g>
          {hairCap}
          <circle cx="50" cy="24" r="5.5" fill={hair} />
          <path d="M45.5 26 L46.5 13 L53.5 13 L54.5 26 Z" fill="#292524" stroke={trim} strokeWidth="0.7" />
          <path d="M40 20 L60 18" stroke="#d6d3d1" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    case 'tribal':
      return (
        <g>
          <path d={cap(38)} fill={hair} />
          <path d={`M${L - 1.5} 42 Q50 31 ${R + 1.5} 42 L${R + 1} 36 Q50 26 ${L - 1} 36 Z`} fill="#b45309" stroke="#fde68a" strokeWidth="0.8" />
          {[42, 50, 58].map((x) => <circle key={x} cx={x} cy={x === 50 ? 32 : 33.5} r="1.3" fill="#22d3ee" />)}
        </g>
      );
    case 'female': {
      const pin = gear === c.f ? '#fbbf24' : gear;
      return (
        <g>
          <path d={`M${L - 2} 56 C${L - 4} 28 ${R + 4} 28 ${R + 2} 56 L${R - 0.5} 52 C${R - 1.5} 41 58 36 50 37.5 C46 40 ${L + 2} 42 ${L + 0.5} 52 Z`} fill={hair} />
          <ellipse cx="41" cy="23" rx="7.5" ry="6" fill={hair} transform="rotate(-20 41 23)" />
          <ellipse cx="59" cy="23" rx="7.5" ry="6" fill={hair} transform="rotate(20 59 23)" />
          <path d="M42 29 Q50 25 58 29" stroke={pin} strokeWidth="1.4" fill="none" />
          <circle cx="58" cy="22" r="2" fill={pin} />
          <path d="M58 24 L60 30 M60 30 l-1 2 m1 -2 l1 2" stroke={pin} strokeWidth="0.7" />
        </g>
      );
    }
    case 'female-war':
      return (
        <g>
          <path d={`M${L - 1.5} 52 C${L - 3} 26 ${R + 3} 26 ${R + 1.5} 52 L${R - 0.5} 48 C${R - 2} 40 56 37 50 38 C45 37.5 ${L + 2} 40 ${L + 0.5} 48 Z`} fill={hair} />
          <path d={`M${L - 1.6} 41 Q50 31 ${R + 1.6} 41 L${R + 1.2} 36.5 Q50 26.5 ${L - 1.2} 36.5 Z`} fill={gear} />
          <circle cx="50" cy="31.5" r="1.6" fill="#fbbf24" />
        </g>
      );
  }
}

function Extras({ c }: { c: Ctx }) {
  const { a, L, R, rx } = c;
  const ex = 5.8 * Math.min(rx / 14.5, 1.12);
  const has = (e: string) => a.extras?.includes(e as never);
  return (
    <g>
      {has('eyepatch') && (
        <g>
          <path d={`M${L} 40 L${R} 46`} stroke="#0c0a09" strokeWidth="1" />
          <ellipse cx={50 - ex} cy="47.2" rx="3.6" ry="3" fill="#0c0a09" />
        </g>
      )}
      {has('scar') && <path d={`M${50 + ex - 1} 50 L${50 + ex + 4} 56`} stroke="#7f1d1d" strokeWidth="1" strokeLinecap="round" />}
      {has('earrings') && (
        <g fill="#fbbf24">
          <circle cx={L + 0.8} cy="55" r="1.4" />
          <circle cx={R - 0.8} cy="55" r="1.4" />
        </g>
      )}
      {has('bells') && (
        <g fill="#fbbf24" stroke="#92400e" strokeWidth="0.5">
          <circle cx={R + 9} cy="52" r="2" />
          <circle cx={R + 13} cy="58" r="2" />
        </g>
      )}
      {has('fan') && (
        <g transform="rotate(-18 24 82)">
          <path d="M24 98 L24 88" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="24" cy="76" rx="10" ry="13" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="0.8" />
          {[-6, -3, 0, 3, 6].map((d) => (
            <path key={d} d={`M24 88 L${24 + d * 1.3} 65`} stroke="#d6d3d1" strokeWidth="0.6" />
          ))}
          <ellipse cx="24" cy="87" rx="3" ry="1.6" fill="#a16207" />
        </g>
      )}
    </g>
  );
}
