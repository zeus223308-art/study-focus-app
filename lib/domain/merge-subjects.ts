import { mergeItemOrder } from '@/lib/domain/reorder';
import type { AppData } from '@/lib/domain/types';

/** Move all bundles from source subject into target and rename target; remove source folder. */
export function mergeSubjectsIntoTarget(
  data: AppData,
  sourceSubjectId: string,
  targetSubjectId: string,
  subjectName: string
): AppData {
  if (sourceSubjectId === targetSubjectId) return data;
  const trimmed = subjectName.trim();
  if (!trimmed) return data;

  const now = new Date().toISOString();
  const targetSubject = data.subjects.find((s) => s.id === targetSubjectId);
  if (!targetSubject) return data;

  const scheduleId = targetSubject.reviewScheduleId;

  const bundles = data.bundles.map((b) => {
    if (b.subjectId !== sourceSubjectId || b.archived) return b;
    return {
      ...b,
      subjectId: targetSubjectId,
      review: { ...b.review, reviewScheduleId: scheduleId },
      updatedAt: now,
    };
  });

  const sourceKeys: string[] = [];
  const movedKeys: string[] = [];
  for (const b of data.bundles) {
    if (b.subjectId !== sourceSubjectId || b.archived) continue;
    for (const p of b.pages) {
      sourceKeys.push(`${b.id}:${p.id}`);
      movedKeys.push(`${b.id}:${p.id}`);
    }
  }

  const subjects = data.subjects
    .filter((s) => s.id !== sourceSubjectId)
    .map((s) => {
      if (s.id !== targetSubjectId) return s;
      let order = [...(s.itemOrder ?? [])];
      order = order.filter((k) => !sourceKeys.some((sk) => sk === k));
      order = mergeItemOrder(order, movedKeys);
      return { ...s, name: trimmed, itemOrder: order };
    });

  return { ...data, subjects, bundles };
}
