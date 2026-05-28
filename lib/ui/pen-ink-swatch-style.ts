import type { ViewStyle } from 'react-native';

import { PEN_INK_COLORS } from '@/lib/domain/pen-colors';
import type { PenToolId } from '@/lib/domain/types';

export function penSwatchStyle(tool: PenToolId): ViewStyle {
  switch (tool) {
    case 'pen-black':
      return {
        backgroundColor: PEN_INK_COLORS['pen-black'],
        borderColor: '#888888',
        borderWidth: 2,
      };
    case 'pen-white':
      return {
        backgroundColor: PEN_INK_COLORS['pen-white'],
        borderColor: '#666666',
        borderWidth: 2,
      };
    case 'pen-red':
      return {
        backgroundColor: PEN_INK_COLORS['pen-red'],
        borderColor: '#B91C1C',
        borderWidth: 1,
      };
    case 'pen-blue':
      return {
        backgroundColor: PEN_INK_COLORS['pen-blue'],
        borderColor: '#1D4ED8',
        borderWidth: 1,
      };
    default:
      return {
        backgroundColor: PEN_INK_COLORS['pen-black'],
        borderColor: '#888888',
        borderWidth: 2,
      };
  }
}
