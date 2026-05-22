import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  reason: 'images' | 'memos';
  used: number;
  max: number;
  onClose: () => void;
};

export function PaywallSheet({ visible, reason, used, max, onClose }: Props) {
  const title = reason === 'images' ? '사진 한도에 도달했어요' : '메모 한도에 도달했어요';
  const body =
    reason === 'images'
      ? `무료 플랜은 사진 ${max}장까지 저장할 수 있어요. (현재 ${used}장)`
      : `무료 플랜은 메모 ${max}개까지 저장할 수 있어요. (현재 ${used}개)`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Text style={styles.pro}>Pro로 무제한 저장 · 클라우드 백업 · 해답 숨기기 해제</Text>
          <Button label="Pro 시작하기" onPress={onClose} style={{ marginTop: 20 }} />
          <Button label="나중에" variant="ghost" onPress={onClose} style={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.beige,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 28,
    paddingBottom: 40,
  },
  accentBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.orange,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: theme.font.heading, fontWeight: '800', color: theme.black },
  body: { fontSize: theme.font.body, color: theme.gray, marginTop: 10, lineHeight: 24 },
  pro: { fontSize: theme.font.bodySmall, color: theme.graySecondary, marginTop: 16 },
});
