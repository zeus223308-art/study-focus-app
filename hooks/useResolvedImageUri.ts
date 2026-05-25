import { useEffect, useState } from 'react';

import { resolveImageUri } from '@/lib/files/resolve-image-uri';

/** Resolve msherpa-asset:// and other stored URIs to a displayable URI (e.g. blob: on web). */
export function useResolvedImageUri(uri: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!uri) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    setResolved(null);
    resolveImageUri(uri).then((next) => {
      if (!cancelled) setResolved(next ?? uri);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return resolved;
}

export async function resolveImageUriForProcessing(uri: string): Promise<string> {
  return (await resolveImageUri(uri)) ?? uri;
}
