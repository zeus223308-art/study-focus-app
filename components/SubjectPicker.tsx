import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStudy } from '@/context/StudyContext';

export function SubjectPicker() {
  const { data, selectedSubjectId, setSelectedSubjectId } = useStudy();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {data.subjects.map((subject) => {
        const active = subject.id === selectedSubjectId;
        return (
          <Pressable
            key={subject.id}
            onPress={() => setSelectedSubjectId(subject.id)}
            style={[
              styles.chip,
              { borderColor: subject.color, backgroundColor: active ? subject.color : 'transparent' },
            ]}>
            <Text style={[styles.chipText, { color: active ? '#fff' : subject.color }]}>
              {subject.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  chipText: { fontSize: 15, fontWeight: '600' },
});
