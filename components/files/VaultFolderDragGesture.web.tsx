import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HoldDragSurface } from '@/components/ui/HoldDragSurface';

type Props = {
  enabled: boolean;
  onLift: (pageX: number, pageY: number) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: (moved: boolean, pageX: number, pageY: number) => void;
  onGestureActiveChange?: (active: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Mobile web: PanResponder page coords work reliably inside horizontal ScrollView. */
export function VaultFolderDragGesture({
  enabled,
  onLift,
  onDragMove,
  onDragEnd,
  onGestureActiveChange,
  children,
  style,
}: Props) {
  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <HoldDragSurface
      enabled
      onLift={onLift}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onGestureActiveChange={onGestureActiveChange}
      style={[style, styles.hit]}>
      {children}
    </HoldDragSurface>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: '100%',
    touchAction: 'none',
    userSelect: 'none',
  } as object,
});
