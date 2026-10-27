import { useSiteTranslation, translate as tr } from '../../../hooks/useSiteTranslation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaClipboardCheck, FaCheckCircle, FaTimesCircle, FaClock, FaUsers, FaCalendarAlt, FaBook, FaLayerGroup, FaSearch, FaSave, FaUndo, FaInfoCircle } from 'react-icons/fa';
import api from '../../../utils/api';
import { attendanceDay, dailyAttendance, todayInDhaka } from '../../../utils/attendance';
import './AttendanceSection.css';

const statusOptions = [
  { value: 'present', label: 'Present', Icon: FaCheckCircle },
  { value: 'absent', label: 'Absent', Icon: FaTimesCircle },
  { value: 'late', label: 'Late', Icon: FaClock }
];
const AttendanceSection = () => {
  const { locale } = useSiteTranslation();
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsError, setOptionsError] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(false);
  const [reload, setReload] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedDate, setSelectedDate] = useState(todayInDhaka);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const today = todayInDhaka();
  const context = `${selectedCourse}:${selectedBatch}:${selectedDate}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOptionsError(false);
    Promise.all([api.get('/enrollments/my-courses'), api.get('/batches/my-batches')]).then(([courseResponse, batchResponse]) => {
      if (!active) return;
      setCourses(courseResponse.data.data || []);
      setBatches(batchResponse.data.data || []);
    }).catch(() => { if (active) setOptionsError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    setEnrollments([]);
    setRosterError(false);
    if (!selectedCourse) { setRosterLoading(false); return () => { active = false; }; }
    setRosterLoading(true);
    const query = selectedBatch === 'all' ? '' : `?batch=${selectedBatch}`;
    api.get(`/enrollments/course/${selectedCourse}${query}`).then(response => {
      if (active) setEnrollments(response.data.data || []);
    }).catch(() => { if (active) setRosterError(true); }).finally(() => { if (active) setRosterLoading(false); });
    return () => { active = false; };
  }, [selectedCourse, selectedBatch, reload]);

  const roster = useMemo(() => enrollments.map(enrollment => {
    const history = dailyAttendance(enrollment.attendance);
    const saved = history.get(selectedDate);
    const status = drafts[context]?.[enrollment._id] || saved?.status || 'present';
    return { enrollment, history, saved, status, pending: !saved || saved.status !== status };
  }), [enrollments, selectedDate, drafts, context]);
  const counts = Object.fromEntries(statusOptions.map(({ value }) => [value, roster.filter(row => row.status === value).length]));
  const pendingCount = roster.filter(row => row.pending).length;
  const visibleRoster = roster.filter(({ enrollment }) => [enrollment.student?.name, enrollment.student?.email, enrollment.student?.phone, enrollment.batch?.name, enrollment.batch?.batchNumber].join(' ').toLowerCase().includes(search.toLowerCase()));
  const course = courses.find(item => item._id === selectedCourse);
  const dateLabel = selectedDate ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(`${selectedDate}T00:00:00+06:00`)) : tr('Select a date');
  const number = value => value.toLocaleString(locale);
  const disabled = submitting || rosterLoading;
  const mark = (enrollmentId, status) => setDrafts(current => ({ ...current, [context]: { ...current[context], [enrollmentId]: status } }));
  const markAll = status => setDrafts(current => ({ ...current, [context]: Object.fromEntries(enrollments.map(enrollment => [enrollment._id, status])) }));
  const reset = () => setDrafts(current => { const next = { ...current }; delete next[context]; return next; });

  const handleSubmit = async event => {
    event.preventDefault();
    if (submitting || !selectedDate || selectedDate > today || !roster.length) return;
    setSubmitting(true);
    try {
      const payload = roster.map(({ enrollment, status }) => ({ enrollmentId: enrollment._id, date: selectedDate, status }));
      const response = await api.post('/enrollments/attendance/bulk', { attendance: payload });
      const results = response.data.data || [];
      const successes = new Map(results.filter(result => result.success).map(result => [result.enrollmentId, result]));
      setEnrollments(current => current.map(enrollment => {
        const result = successes.get(enrollment._id);
        if (!result) return enrollment;
        const requested = payload.find(item => item.enrollmentId === enrollment._id);
        return { ...enrollment, attendance: [...(enrollment.attendance || []).filter(record => attendanceDay(record.date) !== selectedDate), result.attendance || { date: selectedDate, status: requested.status }] };
      }));
      setDrafts(current => {
        const remaining = { ...current[context] };
        for (const key of successes.keys()) delete remaining[key];
        return { ...current, [context]: remaining };
      });
      if (successes.size === payload.length) toast.success(tr('Attendance marked successfully'));
      else toast.error(tr('Some attendance records could not be saved. Review the pending students and try again.'));
    } catch (error) {
      toast.error(tr(error.response?.data?.message || 'Failed to mark attendance'));
    } finally { setSubmitting(false); }
  };

  return <section className="section attendance-page" aria-labelledby="attendance-heading">
    <header className="section-header attendance-page-header">
      <div><h1 id="attendance-heading"><FaClipboardCheck aria-hidden="true" /> {tr('Mark Attendance')}</h1><p>{tr('Choose a class, review your students, and save the day’s attendance.')}</p></div>
    </header>

    <div className="search-filter-bar attendance-session-card">
      <div className="attendance-card-title"><FaCalendarAlt aria-hidden="true" /><h2>{tr('Attendance session')}</h2><span>{tr('Bangladesh time')}</span></div>
      <div className="attendance-filters">
        <div><label htmlFor="attendance-course"><FaBook aria-hidden="true" />{tr('Course')}</label><select id="attendance-course" className="form-control" value={selectedCourse} disabled={loading || submitting || optionsError} onChange={event => { setSelectedCourse(event.target.value); setSelectedBatch('all'); setSearch(''); }}><option value="">{tr('Select Course...')}</option>{courses.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select></div>
        <div><label htmlFor="attendance-batch"><FaLayerGroup aria-hidden="true" />{tr('Batch')}</label><select id="attendance-batch" className="form-control" value={selectedBatch} disabled={!selectedCourse || loading || submitting} onChange={event => { setSelectedBatch(event.target.value); setSearch(''); }}><option value="all">{tr('All Batches')}</option>{batches.filter(batch => (batch.course?._id || batch.course) === selectedCourse).map(batch => <option key={batch._id} value={batch._id}>{batch.name || batch.batchNumber}</option>)}</select></div>
        <div><label htmlFor="attendance-date"><FaCalendarAlt aria-hidden="true" />{tr('Attendance Date')}</label><input id="attendance-date" className="form-control" type="date" value={selectedDate} max={today} required disabled={submitting} onChange={event => setSelectedDate(event.target.value)} /></div>
      </div>
      <div className="attendance-session-note"><FaInfoCircle aria-hidden="true" /><p>{tr('Saved records load for the selected date. New records start as Present; review every student before saving.')}</p></div>
    </div>

    {optionsError ? <div className="data-table attendance-empty" role="alert"><FaInfoCircle aria-hidden="true" /><h2>{tr('Unable to load attendance options')}</h2><button className="btn btn-secondary" onClick={() => setReload(value => value + 1)}>{tr('Retry')}</button></div> : loading ? <div className="data-table attendance-empty" role="status">{tr('Loading...')}</div> : !selectedCourse ? <div className="data-table attendance-empty"><FaClipboardCheck aria-hidden="true" /><h2>{courses.length ? tr('Select a Course') : tr('No assigned courses')}</h2><p>{courses.length ? tr('Please select a course and date to mark attendance.') : tr('Your assigned courses will appear here when available.')}</p></div> : rosterLoading ? <div className="data-table attendance-empty" role="status">{tr('Loading students...')}</div> : rosterError ? <div className="data-table attendance-empty" role="alert"><FaInfoCircle aria-hidden="true" /><h2>{tr('Failed to fetch enrollments')}</h2><button className="btn btn-secondary" onClick={() => setReload(value => value + 1)}>{tr('Retry')}</button></div> : !roster.length ? <div className="data-table attendance-empty"><FaUsers aria-hidden="true" /><h2>{tr('No Students Enrolled')}</h2><p>{tr('There are no students enrolled in this course or batch.')}</p></div> : <>
      <div className="stats-grid attendance-summary" aria-label={tr('Attendance summary')}>
        <div className="stat-card attendance-stat total"><h3><FaUsers aria-hidden="true" />{number(roster.length)}</h3><p>{tr('Total Students')}</p></div>
        {statusOptions.map(({ value, label, Icon }) => <div className={`stat-card attendance-stat ${value}`} key={value}><h3><Icon aria-hidden="true" />{number(counts[value])}</h3><p>{tr(label)}</p></div>)}
      </div>
      <form onSubmit={handleSubmit} className="data-table attendance-roster-card">
        <div className="attendance-roster-heading"><div><h2>{tr('Student attendance')}</h2><p>{course?.title} <span aria-hidden="true">·</span> {dateLabel}</p></div><span className={`status-badge attendance-save-state ${pendingCount ? 'pending' : 'valid'}`} role="status">{pendingCount ? tr('Pending records: {{count}}', { count: number(pendingCount) }) : tr('All records saved')}</span></div>
        <div className="attendance-toolbar">
          <div className="attendance-search"><FaSearch aria-hidden="true" /><input type="search" className="form-control" aria-label={tr('Search students')} placeholder={tr('Search by name, email, or phone')} value={search} onChange={event => setSearch(event.target.value)} /></div>
          <div className="attendance-bulk-actions"><button type="button" className="btn btn-small btn-success attendance-action" disabled={disabled} onClick={() => markAll('present')}><FaCheckCircle aria-hidden="true" />{tr('Mark All Present')}</button><button type="button" className="btn btn-small btn-danger attendance-action" disabled={disabled} onClick={() => markAll('absent')}><FaTimesCircle aria-hidden="true" />{tr('Mark All Absent')}</button><button type="button" className="btn btn-small btn-secondary attendance-reset" disabled={disabled || !drafts[context] || !Object.keys(drafts[context]).length} onClick={reset}><FaUndo aria-hidden="true" />{tr('Reset')}</button></div>
        </div>
        <p className="attendance-roster-caption">{tr('Showing {{visible}} of {{total}} students. Bulk actions and saving apply to the whole selected class.', { visible: number(visibleRoster.length), total: number(roster.length) })}</p>
        <div className="attendance-roster-columns" aria-hidden="true"><span>{tr('Student Name')}</span><span>{tr('Batch')}</span><span>{tr('Attendance')}</span></div>
        <div className="attendance-student-list">
          {visibleRoster.map(({ enrollment, history, saved, status, pending }) => <article className="attendance-student-row" key={enrollment._id}>
            <div className="attendance-student-identity"><span className="attendance-student-avatar" aria-hidden="true">{Array.from(enrollment.student?.name?.trim() || '?')[0]}</span><div><h3>{enrollment.student?.name || tr('N/A')}</h3><p>{enrollment.student?.email || tr('N/A')}</p>{enrollment.student?.phone && <p className="attendance-phone">{enrollment.student.phone}</p>}</div></div>
            <div className="attendance-student-details"><span>{enrollment.batch?.name || enrollment.batch?.batchNumber || tr('Unassigned')}</span><p><FaCheckCircle aria-hidden="true" />{tr('Present days: {{count}}', { count: number([...history.values()].filter(record => record.status === 'present').length) })}</p></div>
            <div className="attendance-status-area"><fieldset disabled={submitting} className="attendance-status-controls"><legend className="attendance-visually-hidden">{tr('Attendance for {{name}}', { name: enrollment.student?.name || tr('Student') })}</legend>{statusOptions.map(({ value, label, Icon }) => <label key={value} className={`attendance-status-option ${value} ${status === value ? 'selected' : ''}`}><input type="radio" name={`attendance-${enrollment._id}`} value={value} checked={status === value} onChange={() => mark(enrollment._id, value)} /><Icon aria-hidden="true" /><span>{tr(label)}</span></label>)}</fieldset><p className={`attendance-record-note ${pending ? 'pending' : 'saved'}`}>{pending ? saved ? tr('Unsaved changes') : tr('Not saved for this date') : tr('Saved for this date')}</p></div>
          </article>)}
          {!visibleRoster.length && <div className="attendance-search-empty">{tr('No matching students. Try another search.')}</div>}
        </div>
        <div className="attendance-save-bar"><div><strong>{dateLabel}</strong><p>{tr('Present: {{present}} · Absent: {{absent}} · Late: {{late}}', { present: number(counts.present), absent: number(counts.absent), late: number(counts.late) })}</p><p>{tr('Attendance Rate')}: {number(Math.round((counts.present + counts.late) / roster.length * 100))}%</p></div><button className="btn btn-primary" type="submit" disabled={submitting || !selectedDate || selectedDate > today || !pendingCount}><FaSave aria-hidden="true" />{submitting ? tr('Submitting...') : tr('Save Attendance')}</button></div>
      </form>
    </>}
  </section>;
};
export default AttendanceSection;
