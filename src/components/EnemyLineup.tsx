import { useState } from 'react';
import type { UnitProfile } from '../engine/unit';
import { Btn, Modal } from './ui';
import { UnitPreview } from './UnitPreview';

/** PC에서는 적 편성을 펼쳐 두고, 모바일에서는 버튼으로 열어 본다. */
export function EnemyLineup({ units }: { units: UnitProfile[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden space-y-2 lg:block">
        {units.map((p, i) => <UnitPreview key={i} p={p} />)}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-stone-700 bg-stone-950/50 py-2.5 text-xs font-bold text-stone-200 lg:hidden"
      >
        적군 {units.length}부대 편성 보기
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="mb-3 font-serif text-lg font-black">적군 편성</h3>
          <div className="space-y-2">
            {units.map((p, i) => <UnitPreview key={i} p={p} />)}
          </div>
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setOpen(false)}>닫기</Btn>
        </Modal>
      )}
    </>
  );
}
