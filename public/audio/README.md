# 배경음악 (BGM)

| 파일명 | 키 | 용도 |
|---|---|---|
| `bgm_lobby.mp3` | `lobby` | 타이틀 · 출진 · 편성 · 등용 · 장수록 · 도전 |
| `bgm_lobby.mp3` | `battle` | 전투 (전투 전용 곡 추가 전 임시로 동일 파일) |

전투 전용 곡이 있으면 `bgm_battle.mp3`로 넣고 `src/audio/audioManager.ts`의 `BGM_FILES.battle`만 바꾸면 됩니다.
