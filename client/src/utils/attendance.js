const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
export const attendanceDay = value => {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return dayFormatter.format(new Date(value));
};
export const todayInDhaka = () => attendanceDay(new Date());
export const dailyAttendance = records => {
  const days = new Map();
  for (const record of records || []) {
    const day = attendanceDay(record.date);
    if (day) days.set(day, record);
  }
  return days;
};
