import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Phone: short edge < 600. Tablet: 600–767. Large tablet (iPad Pro, Tab S): >= 768. */
export type DeviceClass = 'phone' | 'tablet' | 'largeTablet';

export type ViewportLayout = {
  width: number;
  height: number;
  shortEdge: number;
  longEdge: number;
  isLandscape: boolean;
  deviceClass: DeviceClass;
  isPhone: boolean;
  isTablet: boolean;
  /** 본문 최대 너비 (태블릿에서 가독성) */
  contentMaxWidth: number;
  horizontalPadding: number;
  /** 문제 카드 가로 페이저 한 페이지 크기 */
  pagerSize: number;
  /** 폴더·검색 등 리스트 열 수 */
  listNumColumns: number;
  /** 금고 캐러셀 한 페이지당 폴더 타일 수 */
  vaultFoldersPerPage: number;
  /** 대시보드 복습 카드 한 행 개수 */
  dashboardCardsPerRow: number;
};

export function getDeviceClass(width: number, height: number): DeviceClass {
  const short = Math.min(width, height);
  if (short >= 768) return 'largeTablet';
  if (short >= 600) return 'tablet';
  return 'phone';
}

export function computePagerSize(width: number, deviceClass: DeviceClass): number {
  const pad = deviceClass === 'phone' ? 32 : deviceClass === 'tablet' ? 48 : 64;
  const cap = deviceClass === 'phone' ? 400 : deviceClass === 'tablet' ? 520 : 600;
  const available = width - pad;
  return Math.round(Math.max(280, Math.min(cap, available)));
}

/** 금고 캐러셀 — 페이지에 과목 수가 적어도 타일 너비를 동일하게 유지 */
export function computeVaultFolderTileWidth(pageWidth: number, foldersPerPage: number): number {
  const panelPad = 14;
  const gap = 14;
  const inner = pageWidth - panelPad * 2;
  const gaps = Math.max(0, foldersPerPage - 1) * gap;
  return Math.floor((inner - gaps) / Math.max(1, foldersPerPage));
}

export function computeContentMaxWidth(width: number, deviceClass: DeviceClass): number {
  if (deviceClass === 'phone') return width;
  if (deviceClass === 'tablet') return Math.min(width - 48, 720);
  return Math.min(width - 64, 960);
}

export function useViewportLayout(): ViewportLayout {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortEdge = Math.min(width, height);
    const longEdge = Math.max(width, height);
    const isLandscape = width > height;
    const deviceClass = getDeviceClass(width, height);
    const isPhone = deviceClass === 'phone';
    const isTablet = !isPhone;

    const horizontalPadding = isPhone ? 16 : deviceClass === 'tablet' ? 24 : 32;
    const contentMaxWidth = computeContentMaxWidth(width, deviceClass);
    const pagerSize = computePagerSize(width, deviceClass);

    const listNumColumns = isPhone ? 1 : 2;
    const vaultFoldersPerPage = isPhone ? 2 : deviceClass === 'tablet' ? 3 : 4;
    const dashboardCardsPerRow = isPhone ? 1 : 2;

    return {
      width,
      height,
      shortEdge,
      longEdge,
      isLandscape,
      deviceClass,
      isPhone,
      isTablet,
      contentMaxWidth,
      horizontalPadding,
      pagerSize,
      listNumColumns,
      vaultFoldersPerPage,
      dashboardCardsPerPage: dashboardCardsPerRow,
    };
  }, [width, height]);
}
