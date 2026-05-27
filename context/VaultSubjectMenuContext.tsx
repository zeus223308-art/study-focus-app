import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { SubjectFolderHoldMenuSheet } from '@/components/files/SubjectFolderHoldMenuSheet';
import { useApp } from '@/context/AppContext';
import { confirmChoice } from '@/lib/ui/confirm';

type SubjectRef = { id: string; name: string };

type VaultSubjectMenuContextValue = {
  openVaultSubjectMenu: (subjectId: string, subjectName: string) => void;
};

const VaultSubjectMenuContext = createContext<VaultSubjectMenuContextValue | null>(null);

/** Files tab subject long-press menu (delete / reorder) — modal at tab root for web. */
export function VaultSubjectMenuProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { deleteSubject, startSubjectReorder } = useApp();
  const [subject, setSubject] = useState<SubjectRef | null>(null);

  const close = useCallback(() => setSubject(null), []);

  const openVaultSubjectMenu = useCallback((subjectId: string, subjectName: string) => {
    setSubject({ id: subjectId, name: subjectName });
  }, []);

  const value = useMemo(() => ({ openVaultSubjectMenu }), [openVaultSubjectMenu]);

  const confirmDelete = () => {
    if (!subject) return;
    const { id, name } = subject;
    close();
    confirmChoice({
      title: t('vault.deleteFolderTitle'),
      message: t('vault.deleteFolderMessage', { name }),
      yesLabel: t('common.yes'),
      noLabel: t('common.no'),
      onYes: () => deleteSubject(id),
    });
  };

  const startReorder = () => {
    if (!subject) return;
    const { id } = subject;
    close();
    startSubjectReorder(id);
  };

  return (
    <VaultSubjectMenuContext.Provider value={value}>
      {children}
      <SubjectFolderHoldMenuSheet
        visible={subject !== null}
        reorderLabel={t('folder.holdMenuReorder')}
        deleteLabel={t('vault.deleteFolderAction')}
        cancelLabel={t('common.cancel')}
        onReorder={startReorder}
        onDelete={confirmDelete}
        onClose={close}
      />
    </VaultSubjectMenuContext.Provider>
  );
}

export function useVaultSubjectMenu() {
  const ctx = useContext(VaultSubjectMenuContext);
  if (!ctx) {
    throw new Error('useVaultSubjectMenu must be used within VaultSubjectMenuProvider');
  }
  return ctx;
}
