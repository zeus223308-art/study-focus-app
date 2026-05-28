import type { ViewStyle } from 'react-native';

import { PEN_INK_COLORS } from '@/lib/domain/pen-colors';
import type { PenToolId } from '@/lib/domain/types';

export function penSwatchStyle(tool: PenToolId): ViewStyle {
  switch (tool) {
    case 'pen-black':
      return {
        backgroundColor: PEN_INK_COLORS['pen-black'],
        borderColor: 'rgb(136, 136, 136)',
        borderWidth: 2,
      };
    case 'pen-white':
      return {
        backgroundColor: PEN_INK_COLORS['pen-white'],
        borderColor: 'rgb(102, 102, 102)',
        borderWidth: 2,
      };
    case 'pen-red':
      return {
        backgroundColor: PEN_INK_COLORS['pen-red'],
        borderColor: 'rgb(185, 28, 28)',
        borderWidth: 1,
      };
    case 'pen-blue':
      return {
        backgroundColor: PEN_INK_COLORS['pen-blue'],
        borderColor: 'rgb(29, 78, 216)',
        borderWidth: 1,
      };
    default:
      return {
        backgroundColor: PEN_INK_COLORS['pen-black'],
        borderColor: 'rgb(136, 136, 136)',
        borderWidth: 2,
      };
  }
}
