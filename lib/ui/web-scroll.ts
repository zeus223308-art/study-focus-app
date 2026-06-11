import { Platform, type ViewStyle } from 'react-native';

/** ScrollView shell — iOS momentum scroll without stealing child taps. */
export const webScrollViewStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      } as ViewStyle)
    : {};

/** ScrollView content — pan-y only on the scroll shell (`data-rn-scroll`), not here (iOS Safari child taps). */
export const webScrollContentStyle: ViewStyle = {};
