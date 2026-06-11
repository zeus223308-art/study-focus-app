import { Platform, type ViewStyle } from 'react-native';

/** ScrollView shell — iOS momentum scroll without stealing child taps. */
export const webScrollViewStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      } as ViewStyle)
    : {};

/** ScrollView content — vertical pan only; buttons use touch-action: manipulation. */
export const webScrollContentStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        touchAction: 'pan-y',
      } as ViewStyle)
    : {};
