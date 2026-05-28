export type ReviewPagePick = { bundleId: string; pageId: string };

export function routeParamString(value?: string | string[]): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? value.join(',') : value;
}

/** Parse `bundleId:pageId,bundleId:pageId` from dashboard review picker. */
export function parseReviewPageKeys(raw?: string | string[]): ReviewPagePick[] {
  const text = routeParamString(raw);
  if (!text) return [];
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(':');
      if (colon <= 0) return null;
      return {
        bundleId: part.slice(0, colon),
        pageId: part.slice(colon + 1),
      };
    })
    .filter((p): p is ReviewPagePick => p !== null);
}

export function reviewPageKey(pick: ReviewPagePick): string {
  return `${pick.bundleId}:${pick.pageId}`;
}
