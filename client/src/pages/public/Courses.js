import PageHero from '../../components/layout/PageHero';
import { useSiteTranslation, translate as tr } from '../../hooks/useSiteTranslation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  FaCarSide,
  FaArrowLeft,
  FaArrowRight,
  FaClock,
  FaFilter,
  FaSearch,
  FaTools,
  FaUsers
} from 'react-icons/fa';
import { batchAPI, courseAPI, enrollmentAPI, resolveAssetUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './Courses.css';
import EnrollmentSuccess from '../../components/EnrollmentSuccess';
import { availableSeats, courseAvailability, courseBatchGroups } from '../../utils/courseAvailability';
import { hasEnrollment } from '../../utils/enrollmentStatus';
import useStudentEnrollments from '../../hooks/useStudentEnrollments';

const CourseVisual = ({ course }) => {
  const imageUrl = typeof course.image?.url === 'string' ? resolveAssetUrl(course.image.url.trim()) : '';
  const [failedUrl, setFailedUrl] = useState('');
  return <div className="course-media">
    {imageUrl && failedUrl !== imageUrl ?
      <img className="course-card-image" src={imageUrl} alt={course.title} loading="lazy" decoding="async" onError={() => setFailedUrl(imageUrl)} /> :
      <div className="course-icon" aria-hidden="true"><FaCarSide /></div>}
  </div>;
};

const Courses = () => {
  const { locale } = useSiteTranslation();
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [batchError, setBatchError] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [enrolling, setEnrolling] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const fetchSequence = useRef(0);
  const detailsHeading = useRef(null);
  const listContainer = useRef(null);
  const previousSelection = useRef('');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('course') || '';
  const selectedCourse = courses.find(course => course._id === selectedId);
  const selectedStatus = searchParams.get('status') || '';
  const { user } = useAuth();
  const myEnrollments = useStudentEnrollments(user?.role === 'student' ? user._id : '');
  const enrollmentInFlight = useRef(false);
  const navigate = useNavigate();
  const isBangla = i18n.language === 'bn';
  const categories = [...new Set(courses.map(course => course.category).filter(Boolean))];
  const durations = [...new Set(courses.map(course => course.duration).filter(Boolean))];
  const showDetails = (course, status) => {
    const params = new URLSearchParams(searchParams);
    params.set('course', course._id);
    params.set('status', status);
    setSearchParams(params);
  };
  const showList = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('course');
    params.delete('status');
    setSearchParams(params);
  };
  useEffect(() => {
    if (loading) return;
    if (selectedId) {
      detailsHeading.current?.focus({ preventScroll: true });
      detailsHeading.current?.closest('.courses-main')?.scrollIntoView?.({ block: 'start' });
    }
    else if (previousSelection.current) {
      const button = [...(listContainer.current?.querySelectorAll('[data-course-id]') || [])]
        .find(item => item.dataset.courseId === previousSelection.current.id && item.dataset.courseStatus === previousSelection.current.status);
      button?.focus();
    }
    previousSelection.current = selectedId ? { id: selectedId, status: selectedStatus } : '';
  }, [selectedId, selectedStatus, loading]);

  const fetchCourses = useCallback(async (silent = false) => {
    const request = ++fetchSequence.current;
    if (!silent) setLoading(true);
    const [courseResult, batchResult] = await Promise.allSettled([
      courseAPI.getAllCourses({ isActive: true }),
      batchAPI.getAllBatches()
    ]);
    if (request !== fetchSequence.current) return;
    if (courseResult.status === 'fulfilled') {
      setCourses((courseResult.value.data.data || []).filter(course => course.isActive !== false));
      setLoadError(false);
    } else {
      setLoadError(true);
    }
    if (batchResult.status === 'fulfilled') {
      setBatches(batchResult.value.data.data || []);
      setBatchError(false);
    } else {
      setBatches([]);
      setBatchError(true);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    const requests = fetchSequence;
    fetchCourses();
    const refresh = () => {
      if (document.visibilityState !== 'hidden') fetchCourses(true);
    };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      requests.current++;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fetchCourses]);

  const handleEnroll = async (course, batch = null) => {
    if (!batch) {
      navigate('/contact');
      return;
    }
    if (courseAvailability(course, [batch]).status !== 'upcoming' || availableSeats(batch) === 0) return;

    if (!user) {
      toast.info(tr("Please login to enroll in courses"));
      navigate('/login');
      return;
    }

    if (user.role !== 'student') {
      toast.error(tr("Only students can enroll in courses"));
      return;
    }
    if (!myEnrollments.ready || enrollmentInFlight.current || hasEnrollment(myEnrollments.records, course, batch)) return;

    enrollmentInFlight.current = true;
    setEnrolling(batch._id);
    try {
      const response = await enrollmentAPI.createEnrollment({ course: course._id, batch: batch._id });
      setConfirmation(response.data.confirmation);
      myEnrollments.remember(response.data.data || { course: course._id, batch: batch._id, status: 'pending' });
      fetchCourses(true);
    } catch (error) {
      toast.error(tr(error.response?.data?.message || tr("Failed to enroll in course")));
      await myEnrollments.refresh();
    } finally {
      enrollmentInFlight.current = false;
      setEnrolling('');
    }
  };

  const filteredCourses = courses.filter((course) => {
    const groups = courseBatchGroups(course, batches);
    const matchesSearch = `${course.title} ${course.category || ''} ${(course.vehicleTypes || []).join(' ')} ${course.description}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    const matchesDuration = durationFilter === 'all' || course.duration === durationFilter;
    const matchesBatch =
      batchFilter === 'all' ||
      groups.some(group => group.status === batchFilter);

    return matchesSearch && matchesCategory && matchesDuration && matchesBatch;
  });
  const statusOrder = ['upcoming', 'ongoing', 'completed', 'no-schedule'];
  const selectedGroups = selectedCourse ? courseBatchGroups(selectedCourse, batches) : [];
  const detailsStatus = selectedStatus || selectedGroups[0]?.status;
  const validDetailsStatus = [...statusOrder].includes(detailsStatus);
  const detailsGroup = validDetailsStatus ? selectedGroups.find(group => group.status === detailsStatus)
    || { status: detailsStatus, batches: [] } : null;
  const displayedCourses = selectedId ? (selectedCourse && detailsGroup ?
    [{ course: selectedCourse, availability: detailsGroup }] : []) :
    statusOrder.filter(status => batchFilter === 'all' || batchFilter === status).flatMap(status => filteredCourses
      .flatMap(course => courseBatchGroups(course, batches).filter(group => group.status === status)
        .map(availability => ({ course, availability }))));

  return (
    <div className={`courses-page${selectedId ? ' courses-page-details' : ''}`}>
      {confirmation && <EnrollmentSuccess confirmation={confirmation} onClose={() => setConfirmation(null)} />}
      {!selectedId && <PageHero title={t('courses.title')} subtitle={t('courses.subtitle')} />}

      <section className="courses-main container">
        {selectedId ? <div className="course-details-navigation">
          <button type="button" className="btn btn-secondary" onClick={showList}><FaArrowLeft /> {tr('Back to Courses')}</button>
          <span>{tr('Course Details')}</span>
        </div> : <div className="course-filter-panel">
          <div className="course-search-card">
            <FaSearch />
            <input
              type="text"
              placeholder={t('courses.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={tr("Search courses")}
            />
          </div>
          <div className="course-filter-controls" aria-label={tr("Course filters")}>
            <div className="course-filter-label">
              <FaFilter />
              <span>{t('courses.filterLabel')}</span>
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label={tr("Filter by vehicle category")}>
              <option value="all">{t('courses.allCategories')}</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={durationFilter} onChange={(e) => setDurationFilter(e.target.value)} aria-label={tr("Filter by duration")}>
              <option value="all">{t('courses.allDurations')}</option>
              {durations.map(duration => <option key={duration} value={duration}>{duration}</option>)}
            </select>
            <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} aria-label={tr("Filter by batch status")}>
              <option value="all">{t('courses.allBatchStatus')}</option>
              <option value="upcoming">{t('status.upcoming')}</option>
              <option value="ongoing">{t('status.ongoing')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="no-schedule">{t('courses.scheduleNotPublished')}</option>
            </select>
          </div>
        </div>}

        {batchError && <p role="status">{tr("Batch schedules could not be loaded. Please contact us for details.")}</p>}
        {myEnrollments.error && <div role="alert"><p>{tr('Unable to check enrollment status. Please try again.')}</p><button className="btn btn-secondary" onClick={myEnrollments.refresh}>{tr('Try again')}</button></div>}
        <div className={selectedId ? 'course-details-card' : undefined}>
        {!loading && !loadError && selectedCourse && <section className="course-details-overview" aria-labelledby="course-details-title">
          <CourseVisual course={selectedCourse} />
          <div className="course-details-summary">
            <h1 id="course-details-title" ref={detailsHeading} tabIndex={-1}>{selectedCourse.title}</h1>
            <p>{selectedCourse.description}</p>
            <dl className="course-overview-facts">
              {selectedCourse.duration && <div><dt><FaClock /> {t('courses.duration')}</dt><dd>{selectedCourse.duration}</dd></div>}
              {selectedCourse.vehicleTypes?.length > 0 && <div><dt><FaCarSide /> {t('courses.vehicleTypes')}</dt><dd>{selectedCourse.vehicleTypes.join(', ')}</dd></div>}
            </dl>
          </div>
        </section>}
        <div className={`official-courses-grid${selectedId ? ' course-details-grid' : ''}`} ref={listContainer}>
          {loading ? (
            <p role="status">{t('common.loading')}</p>
          ) : loadError ? (
            <div role="alert">
              <p>{tr("Unable to load courses. Please try again.")}</p>
              <button className="btn btn-primary" onClick={() => fetchCourses()}>{tr("Try again")}</button>
            </div>
          ) : selectedId && !selectedCourse ? (
            <p className="no-courses" role="status">{tr('This course is no longer available.')}</p>
          ) : displayedCourses.length === 0 ? (
            <div className="no-courses">{t('courses.noCourses')}</div>
          ) : (
            displayedCourses.map(({ course, availability }, index) => {
              const upcoming = availability.status === 'upcoming';
              return (
                <React.Fragment key={`${course._id}-${availability.status}`}>
                  {!selectedId && (index === 0 || displayedCourses[index - 1].availability.status !== availability.status) &&
                    <h2 className="course-group-heading">{availability.status === 'no-schedule' ? t('courses.scheduleNotPublished') : t(`status.${availability.status}`)}</h2>}
                <article className={`official-course-card course-${availability.status}`}>
                  {!selectedId && <CourseVisual course={course} />}
                  <div className="course-card-header">
                    <div className="course-card-topline">
                      <span className={`course-status course-status-${availability.status}`}>
                        {availability.status === 'no-schedule' ? (batchError ? tr('Schedule unavailable') : t('courses.scheduleNotPublished')) : t(`status.${availability.status}`)}
                      </span>
                    </div>
                    {!selectedId && <h2>{course.title}</h2>}
                    {!selectedId && <p>{course.description}</p>}
                  </div>

                  {course.vehicleTypes?.length > 0 && !selectedId && <div className="course-vehicle-types">
                    <strong>{t('courses.vehicleTypes')}</strong>
                    <span>{course.vehicleTypes.join(', ')}</span>
                  </div>}

                  {selectedId ? <>
                  <div className="course-batches-panel">
                    <h2 className="course-batches-heading">{upcoming ? tr('Upcoming Batches') : availability.status === 'ongoing' ? tr('Ongoing Batches') : availability.status === 'completed' ? tr('Completed Batches') : t('courses.scheduleNotPublished')}</h2>
                    {availability.batches.length === 0 ? (
                      <p>{batchError ? tr('Schedule unavailable') : t('courses.noBatches')}</p>
                    ) : (
                      <div className="course-batch-list">
                        {availability.batches.map((batch) => (
                          <div className="course-batch-item" key={batch._id}>
                            <span>{batch.name || batch.batchNumber}</span>
                            {['ongoing', 'completed'].includes(availability.status) && <dl className="course-batch-details">
                              <div><dt><FaClock />{t('courses.duration')}</dt><dd>{course.duration || t('courses.dateTba')}</dd></div>
                              <div><dt>{tr('End Date')}</dt><dd>{batch.endDate ? new Date(batch.endDate).toLocaleDateString(locale) : t('courses.dateTba')}</dd></div>
                            </dl>}
                            {upcoming && <>
                              <dl className="course-batch-details">
                                <div><dt><FaClock />{t('courses.duration')}</dt><dd>{course.duration || t('courses.dateTba')}</dd></div>
                                <div><dt>{tr('Start Date')}</dt><dd>{batch.startDate ? new Date(batch.startDate).toLocaleDateString(locale) : t('courses.dateTba')}</dd></div>
                                <div><dt>{tr('End Date')}</dt><dd>{batch.endDate ? new Date(batch.endDate).toLocaleDateString(locale) : t('courses.dateTba')}</dd></div>
                                <div><dt><FaUsers />{tr('Available Seats')}</dt><dd>{availableSeats(batch) == null ? t('courses.dateTba') : new Intl.NumberFormat(locale).format(availableSeats(batch))}</dd></div>
                                {(batch.fee ?? course.price) != null && <div><dt>{t('courses.courseFee')}</dt><dd>{new Intl.NumberFormat(isBangla ? 'bn-BD' : 'en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(batch.fee ?? course.price)}</dd></div>}
                                {batch.schedule && <div><dt>{tr('Schedule')}</dt><dd>{batch.schedule}</dd></div>}
                              </dl>
                              <button className="btn btn-primary" onClick={() => handleEnroll(course, batch)} disabled={hasEnrollment(myEnrollments.records, course, batch) || !myEnrollments.ready || !!enrolling || availableSeats(batch) === 0}>
                                {hasEnrollment(myEnrollments.records, course, batch) ? tr('Already Enrolled') : enrolling === batch._id ? t('courses.enrolling') : availableSeats(batch) === 0 ? tr('Batch Full') : t('courses.enrollNow')}
                              </button>
                            </>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {['ongoing', 'no-schedule'].includes(availability.status) && <Link className="btn btn-primary course-contact-action" to="/contact">{t('common.contactUs')}</Link>}
                  </> : <button type="button" className="btn btn-primary course-view-details" data-course-id={course._id} data-course-status={availability.status} onClick={() => showDetails(course, availability.status)}>
                    {tr('View Details')} <FaArrowRight />
                  </button>}
                </article>
                </React.Fragment>
              );
            })
          )}
        </div>
        </div>
      </section>



      {!selectedId && <section className="courses-bottom-cta">
        <div className="container courses-bottom-panel">
          <FaTools />
          <h2>{t('courses.ctaTitle')}</h2>
          <p>{t('courses.ctaText')}</p>
          <Link to="/contact" className="btn btn-primary">{t('common.contactUs')}</Link>
        </div>
      </section>}
    </div>
  );
};

export default Courses;
