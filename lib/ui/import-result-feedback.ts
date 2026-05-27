import type { TFunction } from 'i18next';

import { showMessage } from '@/lib/ui/confirm';
import type { ImportPhotosResult } from '@/services/storage/types';

/** Import/capture batch result — silent on success; alert only when nothing was saved. */
export function reportImportPhotosResult(result: ImportPhotosResult, t: TFunction): void {
  if (result.saved > 0) return;

  if (result.skippedDueToLimit > 0) {
    showMessage('', t('folder.importLimitReached'));
    return;
  }

  if (result.failed) {
    showMessage('', t('folder.importFailed'));
  }
}
