import { useCallback, useEffect, useRef, useState } from 'react';
import { enrollmentAPI } from '../utils/api';

export default function useStudentEnrollments(studentId) {
  const [snapshot, setSnapshot] = useState({ studentId: '', records: [], ready: false });
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (!studentId) return;
    try {
      const response = await enrollmentAPI.getMyEnrollments();
      if (request === sequence.current) setSnapshot({ studentId, records: response.data.data || [], ready: true });
    } catch {
      if (request === sequence.current) setSnapshot(current => ({ studentId,
        records: current.studentId === studentId ? current.records : [], ready: false, error: true }));
    }
  }, [studentId]);
  useEffect(() => {
    const requests = sequence;
    refresh();
    window.addEventListener('focus', refresh);
    return () => { requests.current++; window.removeEventListener('focus', refresh); };
  }, [refresh]);
  const remember = enrollment => {
    setSnapshot(current => ({ studentId, ready: true, records: [
      ...(current.studentId === studentId ? current.records : []), enrollment
    ] }));
  };
  return { records: snapshot.studentId === studentId ? snapshot.records : [],
    ready: !studentId || (snapshot.studentId === studentId && snapshot.ready),
    error: snapshot.studentId === studentId && snapshot.error, refresh, remember };
}
