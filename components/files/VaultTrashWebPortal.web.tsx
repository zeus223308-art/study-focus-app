import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@/constants/theme';

const PORTAL_ID = 'ms-vault-trash-portal';

type Props = {
  visible: boolean;
  ready: boolean;
};

function getPortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let node = document.getElementById(PORTAL_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = PORTAL_ID;
    document.body.appendChild(node);
  }
  return node;
}

/** Plain HTML portal — Chrome/Safari mobile web. */
export function VaultTrashWebPortal({ visible, ready }: Props) {
  const { t } = useTranslation();
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(getPortalRoot());
  }, []);

  if (!visible || !root) {
    return null;
  }

  const popupBorder = ready ? theme.orange : theme.grayLight;
  const popupBg = ready ? theme.orangeMuted : theme.surface;
  const titleColor = ready ? theme.orange : theme.gray;
  const hintColor = ready ? theme.orange : theme.gray;

  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '8px 24px max(20px, env(safe-area-inset-bottom))',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.32)',
        pointerEvents: 'none',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}>
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '14px 18px',
          borderRadius: 12,
          border: `1.5px solid ${popupBorder}`,
          backgroundColor: popupBg,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: titleColor }}>{t('trash.title')}</div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: ready ? 700 : 600,
            color: hintColor,
            lineHeight: 1.35,
          }}>
          {ready ? t('vault.dragTrashRelease') : t('vault.dragTrashKeepPull')}
        </div>
      </div>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          border: `2px solid ${popupBorder}`,
          backgroundColor: popupBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          transform: ready ? 'scale(1.08)' : 'none',
        }}>
        🗑
      </div>
    </div>,
    root
  );
}
