const idOf = value => value?._id || value;

// Batch applications match that batch. Legacy course-only records match the course.
export const hasEnrollment = (enrollments, course, batch) => enrollments.some(enrollment => {
  const enrollmentBatch = idOf(enrollment.batch);
  return batch && enrollmentBatch ? enrollmentBatch === idOf(batch) :
    !enrollmentBatch && idOf(enrollment.course) === idOf(course);
});
