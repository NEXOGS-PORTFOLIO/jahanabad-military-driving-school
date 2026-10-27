const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
const attendanceDay = value => {
  if (!value || !['string', 'number'].includes(typeof value) && !(value instanceof Date)) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  // Date-only inputs must represent a real calendar date, not a rollover.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parsed.toISOString().slice(0, 10) !== value) return '';
  return dayFormatter.format(parsed);
};
const validAttendance = (date, status) => {
  const day = attendanceDay(date);
  return day && day <= attendanceDay(new Date()) && ['present', 'absent', 'late'].includes(status);
};
const saveDailyAttendance = (enrollment, date, status, markedBy) => {
  const day = attendanceDay(date);
  const existing = [...(enrollment.attendance || [])].reverse().find(record => attendanceDay(record.date) === day);
  // Preserve the latest record's ID when correcting a day, and collapse legacy
  // duplicates for that day so repeated saves do not inflate attendance totals.
  const record = { _id: existing?._id, date: existing?.date || new Date(day), status, markedBy };
  enrollment.attendance = (enrollment.attendance || []).filter(item => attendanceDay(item.date) !== day);
  enrollment.attendance.push(record);
  return enrollment.attendance[enrollment.attendance.length - 1];
};
module.exports = { attendanceDay, validAttendance, saveDailyAttendance };
