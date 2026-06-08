/**
 * Web stub — capture tab uses gallery import; avoids pulling ZXing WASM into the bundle.
 */
import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type CameraViewProps = ViewProps & {
  facing?: 'front' | 'back';
};

export const CameraView = forwardRef<View, CameraViewProps>(function CameraView(props, ref) {
  return <View ref={ref} {...props} />;
});

export type PermissionResponse = {
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
  status: 'undetermined' | 'denied' | 'granted';
};

export function useCameraPermissions(): [
  PermissionResponse | null,
  () => Promise<PermissionResponse>,
] {
  const denied: PermissionResponse = {
    granted: false,
    canAskAgain: false,
    expires: 'never',
    status: 'denied',
  };
  return [denied, async () => denied];
}
