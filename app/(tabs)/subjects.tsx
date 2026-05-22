import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useStudy } from '@/context/StudyContext';
import { SUBJECT_COLORS } from '@/lib/defaults';

export default function SubjectsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { data, addSubject, removeSubject } = useStudy();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    addSubject(name, color);
    setName('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemove = (id: string, subjectName: string) => {
    if (data.subjects.length <= 1) {
      Alert.alert('알림', '과목은 최소 1개 이상 필요합니다.');
      return;
    }
    Alert.alert('과목 삭제', `"${subjectName}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => removeSubject(id),
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.text }]}>과목</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        공부 과목을 추가하고 관리하세요
      </Text>

      <Card style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>새 과목</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 물리, 역사"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
          ]}
        />
        <View style={styles.colorRow}>
          {SUBJECT_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={handleAdd}
          style={[styles.addBtn, { backgroundColor: colors.tint }]}>
          <Text style={styles.addBtnText}>추가</Text>
        </Pressable>
      </Card>

      <Card>
        {data.subjects.map((subject, index) => (
          <View
            key={subject.id}
            style={[
              styles.listItem,
              index < data.subjects.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}>
            <View style={[styles.dot, { backgroundColor: subject.color }]} />
            <Text style={[styles.itemName, { color: colors.text }]}>{subject.name}</Text>
            <Pressable onPress={() => handleRemove(subject.id, subject.name)}>
              <Text style={{ color: '#EF4444', fontWeight: '600' }}>삭제</Text>
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#0F172A' },
  addBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  itemName: { flex: 1, fontSize: 16, fontWeight: '600' },
});
