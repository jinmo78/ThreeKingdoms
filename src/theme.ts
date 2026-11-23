/** 화면은 남색 궁정 톤 하나. 밝/어두 전환 없음. */
export function lockTheme() {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#101826');
  try {
    localStorage.removeItem('oath-banner-theme');
  } catch {
    /* ignore */
  }
}
