/** Remove pre-React HTML boot overlay injected in static export. */
export function dismissWebBootOverlay(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('ms-boot');
  if (el) el.remove();
}
