// 그림(webp) 초상이 준비된 장수 id 목록
// public/portraits/<id>.webp 를 넣은 뒤 여기에 id를 추가하면 SVG 대신 그림이 표시된다
// (목록에 없는 장수는 components/Portrait.tsx 의 SVG 초상을 그대로 사용)
export const PORTRAIT_IMAGES = new Set<string>([
]);

export function portraitImageUrl(id: string): string | null {
  return PORTRAIT_IMAGES.has(id) ? `${import.meta.env.BASE_URL}portraits/${id}.webp` : null;
}
