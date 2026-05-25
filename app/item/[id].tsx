import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useApp } from '@/context/AppContext';
import { safeRouterBack } from '@/lib/navigation/safe-back';

/** Legacy route — redirects to bundle viewer */
export default function ItemRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useApp();

  useEffect(() => {
    const byBundle = data.bundles.find((b) => b.id === id);
    const byPage = data.bundles.find((b) => b.pages.some((p) => p.id === id));
    const bundle = byBundle ?? byPage;
    if (bundle) {
      router.replace({ pathname: '/bundle/[id]', params: { id: bundle.id } });
    } else {
      safeRouterBack(router, '/(tabs)/vault');
    }
  }, [id, data.bundles, router]);

  return null;
}
