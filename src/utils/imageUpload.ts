import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copy an image from content:// or file:// to a temp file:// in cache.
 * Android's HTTP layer cannot read content:// URIs for FormData uploads,
 * which causes ERR_NETWORK. Copying to file:// fixes this.
 */
export async function copyImageToCacheUri(
  sourceUri: string,
  index: number,
  mime: string
): Promise<string> {
  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const dir = FileSystem.cacheDirectory ?? '';
  const dest = `${dir}product-upload-${Date.now()}-${index}${ext}`.replace(/\/\/+/g, '/');
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteCacheFiles(uris: string[]): Promise<void> {
  await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true })));
}
