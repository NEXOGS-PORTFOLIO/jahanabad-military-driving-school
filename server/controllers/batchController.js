const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

const ACTIVE_STATUSES = ['upcoming', 'ongoing', 'planned', 'active'];

const normalizeStatus = (status) => {
  if (status === 'planned') return 'upcoming';
  if (status === 'active') return 'ongoing';
  return status;
};

const normalizeInstructorIds = (body) => body.assignedInstructors || body.instructors || [];

const populateBatch = (query) => query
  .populate('course', 'title duration price category description')
  .populate('instructors', 'name email phone role')
  .populate('assignedInstructors', 'name email phone role')
  .populate('createdBy', 'name email');

const syncCounts = async (batchId) => {
  const batch = await Batch.findById(batchId).select('officialStudentCount officialCompletedCount');
  const [enrolledCount, completedCount] = await Promise.all([
    Enrollment.countDocuments({ batch: batchId, status: { $in: ['approved', 'completed'] } }),
    Enrollment.countDocuments({ batch: batchId, status: 'completed' })
  ]);

  const syncedCounts = {
    enrolledCount: Math.max(enrolledCount, batch?.officialStudentCount || 0),
    completedCount: Math.max(completedCount, batch?.officialCompletedCount || 0)
  };

  await Batch.findByIdAndUpdate(batchId, syncedCounts);
  return syncedCounts;
};

const buildBatchResponse = async (batch, includeEnrollments = false) => {
  const counts = await syncCounts(batch._id);
  const batchObject = batch.toObject ? batch.toObject() : batch;
  const data = {
    ...batchObject,
    status: normalizeStatus(batchObject.status),
    batchNumber: batchObject.batchNumber || batchObject.name,
    name: batchObject.name || batchObject.batchNumber,
    instructors: batchObject.assignedInstructors?.length ? batchObject.assignedInstructors : batchObject.instructors,
    assignedInstructors: batchObject.assignedInstructors?.length ? batchObject.assignedInstructors : batchObject.instructors,
    enrolledCount: counts.enrolledCount,
    completedCount: counts.completedCount,
    vacancies: Math.max((batchObject.capacity || 0) - counts.enrolledCount, 0)
  };

  if (includeEnrollments) {
    data.enrollments = await Enrollment.find({ batch: batchObject._id })
      .populate('student', 'name email phone isVerified status')
      .populate('course', 'title')
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 });
  }

  return data;
};

const buildQuery = (req, includeUnpublished = false) => {
  const { course, status, courseType, instructor } = req.query;
  const query = includeUnpublished ? {} : { isPublished: true };

  if (course) query.course = course;
  if (status) {
    const statusValues = status === 'ongoing' ? ['ongoing', 'active'] : status === 'upcoming' ? ['upcoming', 'planned'] : [status];
    query.status = { $in: statusValues };
  }
  if (courseType) query.courseType = courseType;
  if (instructor) query.$or = [{ instructors: instructor }, { assignedInstructors: instructor }];

  return query;
};

const validateBatchBody = async (body) => {
  const name = body.name || body.batchNumber;
  if (!name || !name.trim()) return 'Batch name is required';
  if (!body.course) return 'Course is required';
  if (!body.startDate || Number.isNaN(new Date(body.startDate).getTime())) return 'Valid start date is required';
  if (!body.endDate || Number.isNaN(new Date(body.endDate).getTime())) return 'Valid end date is required';
  if (new Date(body.endDate) < new Date(body.startDate)) return 'End date must be after start date';
  if (body.capacity !== undefined && Number(body.capacity) < 1) return 'Capacity must be at least 1';

  const instructorIds = normalizeInstructorIds(body);
  if (instructorIds.length) {
    const instructorCount = await User.countDocuments({ _id: { $in: instructorIds }, role: 'instructor' });
    if (instructorCount !== instructorIds.length) return 'Assigned instructors must have instructor role';
  }

  return null;
};

const toBatchPayload = (body, userId) => {
  const name = body.name || body.batchNumber;
  const assignedInstructors = normalizeInstructorIds(body);
  const status = normalizeStatus(body.status || 'upcoming');

  return {
    name,
    batchNumber: name,
    batchNo: body.batchNo,
    course: body.course,
    courseType: body.courseType,
    vehicleTypes: Array.isArray(body.vehicleTypes)
      ? body.vehicleTypes
      : (body.vehicleTypes || '').split(',').map(item => item.trim()).filter(Boolean),
    startDate: body.startDate,
    endDate: body.endDate,
    capacity: body.capacity,
    fee: body.fee,
    assignedInstructors,
    instructors: assignedInstructors,
    status,
    schedule: body.schedule,
    notes: body.notes,
    isPublished: body.isPublished === undefined ? true : body.isPublished,
    createdBy: userId
  };
};

exports.getPublicBatches = async (req, res) => {
  try {
    const batches = await populateBatch(Batch.find(buildQuery(req)).sort({ startDate: -1, createdAt: -1 }));
    const data = await Promise.all(batches.map(batch => buildBatchResponse(batch)));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBatch = async (req, res) => {
  try {
    const batch = await populateBatch(Batch.findById(req.params.id));
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    if (!batch.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    res.status(200).json({ success: true, data: await buildBatchResponse(batch, Boolean(req.user)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBatchesAdmin = async (req, res) => {
  try {
    const batches = await populateBatch(Batch.find(buildQuery(req, true)).sort({ startDate: -1, createdAt: -1 }));
    const data = await Promise.all(batches.map(batch => buildBatchResponse(batch, true)));
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyBatches = async (req, res) => {
  try {
    const query = {
      $or: [{ instructors: req.user._id }, { assignedInstructors: req.user._id }]
    };
    const batches = await populateBatch(Batch.find(query).sort({ startDate: -1 }));
    const data = await Promise.all(batches.map(batch => buildBatchResponse(batch, true)));
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const validationError = await validateBatchBody(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const batch = await Batch.create(toBatchPayload(req.body, req.user._id));
    const populatedBatch = await populateBatch(Batch.findById(batch._id));
    res.status(201).json({ success: true, data: await buildBatchResponse(populatedBatch) });
  } catch (error) {
    res.status(error.code === 11000 ? 400 : 500).json({
      success: false,
      message: error.code === 11000 ? 'Batch name already exists' : error.message
    });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const existing = await Batch.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Batch not found' });

    const merged = { ...existing.toObject(), ...req.body };
    const validationError = await validateBatchBody(merged);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const updateData = toBatchPayload(merged, existing.createdBy);
    delete updateData.createdBy;

    const batch = await Batch.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    const populatedBatch = await populateBatch(Batch.findById(batch._id));
    res.status(200).json({ success: true, data: await buildBatchResponse(populatedBatch) });
  } catch (error) {
    res.status(error.code === 11000 ? 400 : 500).json({
      success: false,
      message: error.code === 11000 ? 'Batch name already exists' : error.message
    });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const assignedEnrollments = await Enrollment.countDocuments({ batch: req.params.id });
    if (assignedEnrollments > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete a batch that has enrolled students' });
    }

    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    res.status(200).json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleBatchPublish = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    batch.isPublished = !batch.isPublished;
    await batch.save();
    res.status(200).json({ success: true, data: await buildBatchResponse(batch) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBatchStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);
    if (!['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid batch status' });
    }

    const batch = await Batch.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.status(200).json({ success: true, data: await buildBatchResponse(batch) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
