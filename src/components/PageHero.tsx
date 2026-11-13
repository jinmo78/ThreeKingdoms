import type { ReactNode } from 'react';

/** 페이지 상단의 짧은 시대 그림. 글자는 어두운 그라데이션 위에 둔다. */
export function PageHero({ image, title, aside, children }: {
  image: string;
  title: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative min-h-28 overflow-hidden rounded-2xl border border-stone-800">
      <img
        src={`${import.meta.env.BASE_URL}scenes/${image}`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/94 via-stone-950/80 to-stone-950/45" />
      <div className="relative flex items-end justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-black text-stone-50 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">{title}</h2>
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
