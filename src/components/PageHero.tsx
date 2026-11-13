import type { ReactNode } from 'react';
import { cn } from './ui';

/** 페이지 상단의 시대 그림. 그림이 보이게 왼쪽만 살짝 어둡게 하고, 글자는 흰색으로 둔다. */
export function PageHero({ image, title, aside, children, vivid = false }: {
  image: string;
  title: string;
  aside?: ReactNode;
  children?: ReactNode;
  /** 밤 실내처럼 원본이 어두운 그림은 밝기를 올린다 */
  vivid?: boolean;
}) {
  return (
    <header className="relative min-h-44 overflow-hidden rounded-2xl border border-stone-800">
      <img
        src={`${import.meta.env.BASE_URL}scenes/${image}`}
        alt=""
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          vivid ? 'object-center brightness-[1.85] contrast-[1.05] saturate-[1.08]' : 'object-[center_40%]',
        )}
      />
      <div className={cn(
        'absolute inset-0 bg-gradient-to-r',
        vivid ? 'from-black/40 via-transparent to-transparent' : 'from-black/60 via-black/25 to-black/5',
      )} />
      <div className="relative flex min-h-44 items-end justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className="hero-on-art min-w-0">
          <h2 className="font-serif text-2xl font-black text-white">{title}</h2>
          {children}
        </div>
        {aside}
      </div>
    </header>
  );
}

export function sceneUrl(file: string) {
  return `${import.meta.env.BASE_URL}scenes/${file}`;
}
