import { useTranslation } from 'react-i18next';

import { SettingsGroup } from '@/components/SettingsGroup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { TrashContents } from '@/components/trash/TrashContents';

export default function TrashScreen() {
  const { t } = useTranslation();

  return (
    <Screen scroll>
      <ScreenHeader title="" showBack backFallback="/(tabs)/vault" showSettings={false} />
      <SettingsGroup title={t('trash.title')}>
        <TrashContents />
      </SettingsGroup>
    </Screen>
  );
}
