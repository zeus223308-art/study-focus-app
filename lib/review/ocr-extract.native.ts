import { isSupported, recognizeText } from 'expo-mlkit-ocr';

export async function extractOcrFromImageUri(uri: string): Promise<string> {
  if (!uri?.trim()) return '';
  if (!isSupported()) return '';
  try {
    const result = await recognizeText(uri);
    return (result.text ?? '').trim();
  } catch {
    return '';
  }
}

export function isOcrAvailable(): boolean {
  return isSupported();
}
