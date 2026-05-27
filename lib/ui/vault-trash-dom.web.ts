/** Imperative trash overlay — bypasses React portal issues on mobile Safari/Chrome. */

let node: HTMLDivElement | null = null;

type Copy = { title: string; hint: string };

export function setVaultTrashDom(show: boolean, ready: boolean, copy: Copy): void {
  if (typeof document === 'undefined') return;

  if (!show) {
    hideVaultTrashDom();
    return;
  }

  if (!node) {
    node = document.createElement('div');
    node.id = 'ms-vault-trash-dom';
    document.body.appendChild(node);
  }

  const border = ready ? '#FF6B00' : '#3D3A36';
  const bg = ready ? 'rgba(255, 107, 0, 0.22)' : '#262626';
  const titleColor = ready ? '#FF6B00' : '#C8C2BA';
  const hintColor = ready ? '#FF6B00' : '#C8C2BA';

  node.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:flex',
    'flex-direction:column',
    'justify-content:flex-end',
    'align-items:center',
    'padding:8px 24px max(20px, env(safe-area-inset-bottom))',
    'gap:12px',
    'background:rgba(0,0,0,0.45)',
    'pointer-events:none',
    '-webkit-transform:translateZ(0)',
    'transform:translateZ(0)',
  ].join(';');

  node.innerHTML = `
    <div style="width:100%;max-width:320px;padding:14px 18px;border-radius:12px;border:1.5px solid ${border};background:${bg};text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
      <div style="font-size:16px;font-weight:800;color:${titleColor};">${escapeHtml(copy.title)}</div>
      <div style="margin-top:6px;font-size:13px;font-weight:${ready ? 700 : 600};color:${hintColor};line-height:1.35;">${escapeHtml(copy.hint)}</div>
    </div>
    <div style="width:64px;height:64px;border-radius:32px;border:2px solid ${border};background:${bg};display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 8px 24px rgba(0,0,0,0.25);transform:${ready ? 'scale(1.08)' : 'none'};">🗑</div>
  `;
}

export function hideVaultTrashDom(): void {
  if (node) {
    node.style.display = 'none';
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
