/** URIs that can be passed straight to Image / img without msherpa resolution. */
export function isDirectImageUri(uri: string | null | undefined): uri is string {
  if (!uri) return false;
  return (
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('blob:') ||
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  );
}
