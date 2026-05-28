import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { heightForLandscapeCardWidth } from '@/lib/ui/landscape-card-layout';

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
  /** 과목 폴더 날짜별 앨범 그리드 열 수 */
  albumNumColumns: number;
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

export function computePagerSize(width: number, height: number, deviceClass: DeviceClass): number {
  const isLandscape = width > height;
  const pad = isLandscape
    ? deviceClass === 'phone'
      ? 16
      : deviceClass === 'tablet'
        ? 24
        : 32
    : deviceClass === 'phone'
      ? 32
      : deviceClass === 'tablet'
        ? 48
        : 64;
  const cap = isLandscape
    ? Math.round(width - pad)
    : deviceClass === 'phone'
      ? 400
      : deviceClass === 'tablet'
        ? 520
        : 600;
  const available = width - pad;
  return Math.round(Math.max(280, Math.min(cap, available)));
}

export const VAULT_PANEL_PAD = 14;
export const VAULT_TILE_GAP = 14;
export const VAULT_MIN_TILE_WIDTH = 72;
export const VAULT_NAME_ROW_HEIGHT = 32;
export const VAULT_PREVIEW_HEIGHT = 112;
export const VAULT_TILE_HEIGHT = VAULT_NAME_ROW_HEIGHT + VAULT_PREVIEW_HEIGHT;

/** Subject album grid — minimal gutter between photo tiles. */
export const ALBUM_TILE_GAP = 2;

/** Files tab: always two subject folders per visible row (swipe for more). */
export function computeVaultFoldersPerPage(_pageWidth: number): number {
  return 2;
}

/** 금고 캐러셀 — 페이지에 과목 수가 적어도 타일 너비를 동일하게 유지 */
export function computeVaultFolderTileWidth(pageWidth: number, foldersPerPage: number): number {
  const inner = pageWidth - VAULT_PANEL_PAD * 2;
  const gaps = Math.max(0, foldersPerPage - 1) * VAULT_TILE_GAP;
  return Math.floor((inner - gaps) / Math.max(1, foldersPerPage));
}

export function vaultCarouselItemLength(index: number, tileWidth: number): number {
  return index === 0 ? tileWidth : VAULT_TILE_GAP + tileWidth;
}

export function vaultCarouselItemOffset(index: number, tileWidth: number): number {
  if (index <= 0) return 0;
  return tileWidth + (index - 1) * (tileWidth + VAULT_TILE_GAP);
}

export function vaultCarouselScrollWidth(subjectCount: number, tileWidth: number): number {
  if (subjectCount <= 0) return 0;
  return subjectCount * tileWidth + subjectCount * VAULT_TILE_GAP;
}

export function computeContentMaxWidth(
  width: number,
  height: number,
  deviceClass: DeviceClass
): number {
  const isLandscape = width > height;
  if (isLandscape) {
    const pad = deviceClass === 'phone' ? 12 : deviceClass === 'tablet' ? 16 : 24;
    return width - pad * 2;
  }
  if (deviceClass === 'phone') return width;
  if (deviceClass === 'tablet') return Math.min(width - 48, 720);
  return Math.min(width - 64, 960);
}

export type BundlePhotoLayout = {
  maxWidth: number;
  maxHeight: number;
  sideBySide: boolean;
  columnGap: number;
};

/** Problem + answer thumbnails on the bundle card screen. */
export function computeBundlePhotoLayout(layout: ViewportLayout): BundlePhotoLayout {
  const innerW = layout.width - layout.horizontalPadding * 2;
  if (layout.isLandscape) {
    const columnGap = 12;
    const colW = Math.floor((innerW - columnGap) / 2);
    const chromeReserve = layout.isPhone ? 168 : 220;
    const maxHeight = Math.max(
      96,
      Math.min(
        heightForLandscapeCardWidth(colW, true),
        layout.shortEdge - chromeReserve
      )
    );
    return {
      maxWidth: colW,
      maxHeight,
      sideBySide: true,
      columnGap,
    };
  }
  return {
    maxWidth: innerW,
    maxHeight: 220,
    sideBySide: false,
    columnGap: 0,
  };
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

    const horizontalPadding = isLandscape
      ? isPhone
        ? 12
        : deviceClass === 'tablet'
          ? 16
          : 20
      : isPhone
        ? 16
        : deviceClass === 'tablet'
          ? 24
          : 32;
    const contentMaxWidth = computeContentMaxWidth(width, height, deviceClass);
    const pagerSize = computePagerSize(width, height, deviceClass);

    const listNumColumns = isPhone ? 1 : 2;
    const albumNumColumns = isLandscape
      ? deviceClass === 'phone'
        ? Math.min(14, Math.max(9, Math.floor(width / 56)))
        : deviceClass === 'tablet'
          ? Math.min(16, Math.max(10, Math.floor(width / 64)))
          : Math.min(18, Math.max(12, Math.floor(width / 72)))
      : deviceClass === 'phone'
        ? 7
        : deviceClass === 'tablet'
          ? 8
          : 11;
    const vaultFoldersPerPage = computeVaultFoldersPerPage(width);
    const dashboardCardsPerRow =
      isLandscape && deviceClass !== 'phone' ? 3 : isPhone && !isLandscape ? 1 : 2;

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
      albumNumColumns,
      vaultFoldersPerPage,
      dashboardCardsPerRow,
    };
  }, [width, height]);
}
