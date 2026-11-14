import { isFreshSave, saveSignature, type SaveData } from '../store/saveData';

export type SyncDecision = 'upload' | 'same' | 'download' | 'conflict';

/** 클라우드 문서와 이 기기 기록을 어떻게 맞출지. 네트워크와 무관한 판단만 둔다. */
export function decideSync(local: SaveData, remote: SaveData | null): SyncDecision {
  if (!remote) return 'upload';
  if (saveSignature(local) === saveSignature(remote)) return 'same';
  if (isFreshSave(local)) return 'download';
  return 'conflict';
}
