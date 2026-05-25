import { useEffect, useState } from 'react';

import { isDirectImageUri } from '@/lib/files/direct-image-uri';
import { resolveImageUri } from '@/lib/files/resolve-image-uri';

/** Resolve msherpa-asset:// and other stored URIs to a displayable URI (e.g. blob: on web). */
export function useResolvedImageUri(uri: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    isDirectImageUri(uri) ? uri : null
  );

  useEffect(() => {
    if (!uri) {
      setResolved(null);
      return;
    }
    if (isDirectImageUri(uri)) {
      setResolved(uri);
      return;
    }

    let cancelled = false;
    resolveImageUri(uri)
      .then((next) => {
        if (!cancelled) setResolved(next ?? uri);
      })
      .catch(() => {
        if (!cancelled) setResolved(uri);
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
