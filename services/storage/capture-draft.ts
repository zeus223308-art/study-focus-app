import AsyncStorage from '@react-native-async-storage/async-storage';

import { scopedStorageKey, getActiveStorageScopeId } from './storage-scope';

const CAPTURE_DRAFT_KEY_BASE = '@memory_sherpa_capture_draft_v1';

/** Max age before an unsaved capture draft is ignored. */
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CaptureDraft = {
  frontUri: string;
  backUri: string | null;
  subjectId: string;
  studyDate: string;
  selectedTags?: string[];
  step: 'answer-prompt' | 'save-sheet';
  updatedAt: string;
};

async function draftKey(): Promise<string> {
  return scopedStorageKey(CAPTURE_DRAFT_KEY_BASE, await getActiveStorageScopeId());
}

export async function readCaptureDraft(): Promise<CaptureDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(await draftKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaptureDraft;
    if (!parsed.frontUri || !parsed.updatedAt) return null;
    if (Date.now() - new Date(parsed.updatedAt).getTime() > DRAFT_MAX_AGE_MS) {
      await clearCaptureDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCaptureDraft(draft: CaptureDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(await draftKey(), JSON.stringify(draft));
  } catch {
    // Quota or transient — ignore; URIs are already stabilized on disk when possible.
  }
}

export async function clearCaptureDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(await draftKey());
  } catch {
    // ignore
  }
}
