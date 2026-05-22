import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  type DeviceClass,
  getDeviceClass,
  useViewportLayout,
} from '@/lib/ui/viewport-layout';

export type { DeviceClass };

export type FullscreenViewerMetrics = {
  kindBtnPaddingH: number;
  kindBtnPaddingV: number;
  kindFontSize: number;
  pickerMaxWidth: number;
  pickerPadding: number;
  swatchSize: number;
  sizeDotMax: number;
  chipLabelSize: number;
  pickerGap: number;
  toolbarGap: number;
  topCloseSize: number;
  sideChipPaddingH: number;
  sideChipPaddingV: number;
  sideFontSize: number;
};

export type FullscreenViewerLayout = {
  width: number;
  height: number;
  shortEdge: number;
  longEdge: number;
  isLandscape: boolean;
  deviceClass: DeviceClass;
  isPhone: boolean;
  isTablet: boolean;
  /** 가로 모드: 상단 한 줄 (휴대폰·태블릿 공통) */
  useUnifiedTopBar: boolean;
  imageMaxWidth: number;
  inkToolbarMaxWidth: number;
  metrics: FullscreenViewerMetrics;
};

function metricsFor(deviceClass: DeviceClass, isLandscape: boolean): FullscreenViewerMetrics {
  if (deviceClass === 'phone') {
    return {
      kindBtnPaddingH: isLandscape ? 12 : 14,
      kindBtnPaddingV: isLandscape ? 6 : 8,
      kindFontSize: isLandscape ? 12 : 13,
      pickerMaxWidth: isLandscape ? 340 : 360,
      pickerPadding: 10,
      swatchSize: 26,
      sizeDotMax: 22,
      chipLabelSize: 10,
      pickerGap: 8,
      toolbarGap: 6,
      topCloseSize: 40,
      sideChipPaddingH: 10,
      sideChipPaddingV: isLandscape ? 5 : 6,
      sideFontSize: 12,
    };
  }
  if (deviceClass === 'tablet') {
    return {
      kindBtnPaddingH: 20,
      kindBtnPaddingV: 10,
      kindFontSize: 15,
      pickerMaxWidth: 480,
      pickerPadding: 14,
      swatchSize: 34,
      sizeDotMax: 28,
      chipLabelSize: 12,
      pickerGap: 12,
      toolbarGap: 10,
      topCloseSize: 48,
      sideChipPaddingH: 16,
      sideChipPaddingV: 8,
      sideFontSize: 14,
    };
  }
  return {
    kindBtnPaddingH: 24,
    kindBtnPaddingV: 12,
    kindFontSize: 16,
    pickerMaxWidth: 560,
    pickerPadding: 16,
    swatchSize: 38,
    sizeDotMax: 32,
    chipLabelSize: 13,
    pickerGap: 14,
    toolbarGap: 12,
    topCloseSize: 52,
    sideChipPaddingH: 18,
    sideChipPaddingV: 9,
    sideFontSize: 15,
  };
}

export function useFullscreenViewerLayout(): FullscreenViewerLayout {
  const viewport = useViewportLayout();
  const { width, height, isLandscape, deviceClass, isPhone, isTablet } = viewport;

  return useMemo(() => {
    const shortEdge = Math.min(width, height);
    const longEdge = Math.max(width, height);
    const useUnifiedTopBar = isLandscape;

    const horizontalPad = isPhone ? 16 : 28;
    const imageMaxWidth = isPhone
      ? width - horizontalPad
      : deviceClass === 'tablet'
        ? Math.min(width * 0.9, 820)
        : Math.min(width * 0.82, 1100);

    const inkToolbarMaxWidth = isPhone
      ? Math.min(width - 24, 360)
      : deviceClass === 'tablet'
        ? 520
        : 640;

    return {
      width,
      height,
      shortEdge,
      longEdge,
      isLandscape,
      deviceClass,
      isPhone,
      isTablet,
      useUnifiedTopBar,
      imageMaxWidth,
      inkToolbarMaxWidth,
      metrics: metricsFor(deviceClass, isLandscape),
    };
  }, [width, height, isLandscape, deviceClass, isPhone, isTablet]);
}
