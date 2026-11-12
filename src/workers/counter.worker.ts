// 적군 맞춤 편성 계산 (수천 번의 전투 시뮬레이션) — 화면이 멈추지 않도록 Web Worker에서 실행
import { counterFormation, type CounterInput } from '../engine/counterFormation';

const ctx = self as unknown as {
  postMessage: (msg: unknown) => void;
  onmessage: ((e: MessageEvent<CounterInput>) => void) | null;
};

ctx.onmessage = (e) => {
  const result = counterFormation(e.data, (ratio, best) => ctx.postMessage({ type: 'progress', ratio, best }));
  ctx.postMessage({ type: 'done', result });
};
