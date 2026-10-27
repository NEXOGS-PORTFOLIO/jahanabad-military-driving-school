const timestamp = value => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
};
const latestFirst = (a, b) => timestamp(b.startDate) - timestamp(a.startDate)
  || timestamp(b.createdAt) - timestamp(a.createdAt)
  || String(b._id).localeCompare(String(a._id));

export const availableSeats = batch => {
  if (batch.vacancies != null && Number.isFinite(Number(batch.vacancies))) {
    return Math.max(0, Number(batch.vacancies));
  }
  if (batch.capacity == null || !Number.isFinite(Number(batch.capacity))) return null;
  return Math.max(0, Number(batch.capacity) - Math.max(0, Number(batch.enrolledCount) || 0));
};

export const courseBatchGroups = (course, batches) => {
  const linked = batches.filter(batch => (batch.course?._id || batch.course) === course._id
    && batch.isPublished !== false);
  const groups = [];
  for (const status of ['upcoming', 'ongoing', 'completed']) {
    const matching = linked.filter(batch => batch.status === status).sort(latestFirst);
    if (matching.length) {
      groups.push({ status, batches: status === 'upcoming' ? matching.reverse() : matching });
    }
  }
  return groups.length ? groups : [{ status: 'no-schedule', batches: [] }];
};
export const courseAvailability = (course, batches) => courseBatchGroups(course, batches)[0];
