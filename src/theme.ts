/** 앤티크 양피지·암갈색 오크. 밝/어두 전환 없음. */
export function lockTheme() {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#E6DBC6');
  try {
    localStorage.removeItem('oath-banner-theme');
  } catch {
    /* ignore */
  }
}
