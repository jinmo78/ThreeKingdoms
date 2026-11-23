/** 화면은 밝은 양피지·오크 톤 하나. 밝/어두 전환 없음. */
export function lockTheme() {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F4EFE6');
  try {
    localStorage.removeItem('oath-banner-theme');
  } catch {
    /* ignore */
  }
}
