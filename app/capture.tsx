import { Redirect } from 'expo-router';

/** Legacy modal route → Camera tab */
export default function CaptureRedirect() {
  return <Redirect href="/(tabs)/capture" />;
}
