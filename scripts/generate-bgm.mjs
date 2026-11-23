/**
 * 임시 BGM WAV 합성 (외부 음원 넣기 전 플레이스홀더).
 * 로비: 느린 오각음 패드 / 전투: 조금 더 빠른 저음+박자
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'audio');
const SR = 16000;

function freq(semi, base = 110) {
  return base * 2 ** (semi / 12);
}

function writeWav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

function env(t, attack, release, dur) {
  if (t < attack) return t / attack;
  if (t > dur - release) return Math.max(0, (dur - t) / release);
  return 1;
}

function softNoise(t) {
  const x = Math.sin(t * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** 로비: 따뜻한 오각 패드, ~32초 루프 */
function lobby(seconds = 32) {
  const n = Math.floor(SR * seconds);
  const out = new Float64Array(n);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16]; // 장조 느낌 오각+확장
  const chords = [
    [0, 4, 7, 12],
    [2, 5, 9, 14],
    [4, 7, 11, 16],
    [0, 5, 9, 12],
  ];
  const bar = 3.0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const barIdx = Math.floor(t / bar) % chords.length;
    const chord = chords[barIdx];
    let s = 0;
    for (let c = 0; c < chord.length; c++) {
      const f = freq(chord[c], 98);
      const phase = t * f * Math.PI * 2;
      s += Math.sin(phase) * 0.18;
      s += Math.sin(phase * 2) * 0.04;
      s += Math.sin(phase * 0.5) * 0.06;
    }
    // 느리게 도는 상단 멜로디
    const mel = scale[Math.floor((t * 0.35) % scale.length)];
    const mf = freq(mel, 196);
    s += Math.sin(t * mf * Math.PI * 2) * 0.07 * (0.5 + 0.5 * Math.sin(t * 0.4));
    // 아주 약한 노이즈 텍스처
    s += softNoise(t * 0.7) * 0.015;
    const e = env(t, 0.8, 1.2, seconds);
    out[i] = s * e * 0.55;
  }
  // 루프 이음새 페이드
  const fade = Math.floor(SR * 0.6);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  return out;
}

/** 전투: 낮은 펄스 + 긴장감 있는 5도, ~28초 */
function battle(seconds = 28) {
  const n = Math.floor(SR * seconds);
  const out = new Float64Array(n);
  const pulseHz = 2.2;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const pulse = Math.max(0, Math.sin(t * pulseHz * Math.PI * 2)) ** 2;
    const kick = Math.sin(t * 55 * Math.PI * 2) * pulse * 0.35;
    const drone = Math.sin(t * freq(0, 73) * Math.PI * 2) * 0.2
      + Math.sin(t * freq(7, 73) * Math.PI * 2) * 0.12
      + Math.sin(t * freq(3, 73) * Math.PI * 2) * 0.08;
    const stabT = t % 1.5;
    const stab = stabT < 0.12
      ? Math.sin(t * freq(12, 110) * Math.PI * 2) * (1 - stabT / 0.12) * 0.22
      : 0;
    const hiss = softNoise(t * 3.1) * pulse * 0.04;
    const e = env(t, 0.4, 0.8, seconds);
    out[i] = (kick + drone + stab + hiss) * e * 0.65;
  }
  const fade = Math.floor(SR * 0.5);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  return out;
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'bgm_lobby.wav'), writeWav(lobby()));
await writeFile(path.join(outDir, 'bgm_battle.wav'), writeWav(battle()));
console.log('wrote bgm_lobby.wav, bgm_battle.wav');
