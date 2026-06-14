import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Android Chrome baseline — Playwright parity locks WebKit to the same row box. */
const ROW_HEIGHT = 46;
const ROW_TALL_HEIGHT = 54;
const SCREEN_HEADER_HEIGHT = 36;
const SECTION_HEADER_HEIGHT = 27;
const GROUP_TITLE_HEIGHT = 19;
const CLOUD_HEADER_HEIGHT = 50;

/** Fixed-height settings rows on mobile web (iOS Safari matches Android Chrome). */
export function settingsRowBoxWeb(tall = false): ViewStyle {
  if (Platform.OS !== 'web') return {};
  const height = tall ? ROW_TALL_HEIGHT : ROW_HEIGHT;
  return {
    boxSizing: 'border-box',
    height,
    minHeight: height,
    maxHeight: height,
    paddingVertical: 0,
  } as ViewStyle;
}

export function screenHeaderRowWeb(): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    boxSizing: 'border-box',
    height: SCREEN_HEADER_HEIGHT,
    minHeight: SCREEN_HEADER_HEIGHT,
    maxHeight: SCREEN_HEADER_HEIGHT,
    marginBottom: 20,
    paddingVertical: 0,
  } as ViewStyle;
}

export function settingsSectionHeaderRowWeb(): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    boxSizing: 'border-box',
    height: SECTION_HEADER_HEIGHT,
    minHeight: SECTION_HEADER_HEIGHT,
    maxHeight: SECTION_HEADER_HEIGHT,
    marginBottom: 6,
    paddingVertical: 0,
  } as ViewStyle;
}

export function settingsGroupTitleWeb(): TextStyle {
  if (Platform.OS !== 'web') return {};
  return {
    boxSizing: 'border-box',
    height: GROUP_TITLE_HEIGHT,
    minHeight: GROUP_TITLE_HEIGHT,
    lineHeight: GROUP_TITLE_HEIGHT,
    marginBottom: 6,
  } as TextStyle;
}

export function cloudBackupHeaderRowWeb(): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    boxSizing: 'border-box',
    height: CLOUD_HEADER_HEIGHT,
    minHeight: CLOUD_HEADER_HEIGHT,
    maxHeight: CLOUD_HEADER_HEIGHT,
    paddingTop: 0,
    paddingVertical: 0,
  } as ViewStyle;
}
