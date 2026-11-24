import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages는 https://<user>.github.io/ThreeKingdoms/ 경로로 서비스되므로 빌드 시 base 경로 지정
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ThreeKingdoms/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // GitHub Pages는 .webmanifest를 JSON이 아닌 타입으로 주는 경우가 있어 설치 기준이 깨진다.
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og.png', 'audio/bgm_lobby.mp3', 'audio/bgm_battle.mp3'],
      manifest: {
        name: '삼국지: 무장편성록',
        short_name: '무장편성록',
        description: '삼국지: 무장편성록 (武將編成錄)',
        lang: 'ko',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'any',
        background_color: '#140e0c',
        theme_color: '#f3eadb',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 장수 초상·타이틀 아트 포함. Firebase/폰트는 런타임 캐시.
        // BGM mp3(~5MB) precache. 기본 2MiB보다 크게.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2,mp3}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
}));
