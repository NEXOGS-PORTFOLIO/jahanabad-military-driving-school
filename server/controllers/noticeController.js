const Notice = require('../models/Notice');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const VALID_TYPES = ['Announcement', 'Update', 'Notice'];
const isCloudinaryImage = (image) => image?.public_id && !image.public_id.startsWith('local:');

const createSlugBase = (title, type, publishDate) => {
  const titleSlug = (title || '')
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (titleSlug) {
    return titleSlug;
  }

  const dateValue = publishDate ? new Date(publishDate) : new Date();
  const datePart = Number.isNaN(dateValue.getTime())
    ? new Date().toISOString().slice(0, 10)
    : dateValue.toISOString().slice(0, 10);

  return `${(type || 'notice').toLowerCase()}-${datePart}-${Date.now()}`;
};

const generateUniqueSlug = async (title, type, publishDate, currentId = null) => {
  const base = createSlugBase(title, type, publishDate);
  let slug = base;
  let counter = 1;

  while (await Notice.findOne({
    slug,
    ...(currentId ? { _id: { $ne: currentId } } : {})
  })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
};

const buildQuery = (req, includeUnpublished = false) => {
  const query = includeUnpublished ? {} : { isPublished: true };

  if (req.query.type && VALID_TYPES.includes(req.query.type)) {
    query.type = req.query.type;
  }

  if (req.query.search) {
    const search = req.query.search.trim();
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } }
    ];
  }

  return query;
};

const validateNoticeInput = ({ title, type, content, publishDate }) => {
  if (!title || !title.trim()) {
    return 'Title is required';
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return 'Valid type is required';
  }

  if (!content || !content.trim()) {
    return 'Content is required';
  }

  if (!publishDate || Number.isNaN(new Date(publishDate).getTime())) {
    return 'Valid publish date is required';
  }

  return null;
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
};

exports.getNotices = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 50);
    let noticesQuery = Notice.find(buildQuery(req))
      .sort({ publishDate: -1, createdAt: -1 });

    if (limit > 0) {
      noticesQuery = noticesQuery.limit(limit);
    }

    const notices = await noticesQuery;

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getNoticeBySlug = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      slug: req.params.slug,
      isPublished: true
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAllNoticesAdmin = async (req, res) => {
  try {
    const notices = await Notice.find(buildQuery(req, true))
      .sort({ publishDate: -1, createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.createNotice = async (req, res) => {
  try {
    const validationError = validateNoticeInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { title, type, content, excerpt, publishDate, featured } = req.body;
    const noticeData = {
      title: title.trim(),
      type,
      content: content.trim(),
      excerpt: excerpt ? excerpt.trim() : '',
      publishDate,
      isPublished: req.body.isPublished === undefined ? true : normalizeBoolean(req.body.isPublished),
      featured: normalizeBoolean(featured),
      slug: await generateUniqueSlug(title, type, publishDate),
      createdBy: req.user._id
    };

    if (req.file) {
      noticeData.image = await uploadToCloudinary(req.file.buffer, 'jmds/notices');
    }

    const notice = await Notice.create(noticeData);

    res.status(201).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateNotice = async (req, res) => {
  try {
    let notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    const nextValues = {
      title: req.body.title !== undefined ? req.body.title : notice.title,
      type: req.body.type !== undefined ? req.body.type : notice.type,
      content: req.body.content !== undefined ? req.body.content : notice.content,
      publishDate: req.body.publishDate !== undefined ? req.body.publishDate : notice.publishDate
    };

    const validationError = validateNoticeInput(nextValues);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const oldImage = notice.image;

    notice.title = nextValues.title.trim();
    notice.type = nextValues.type;
    notice.content = nextValues.content.trim();
    notice.excerpt = req.body.excerpt !== undefined ? req.body.excerpt.trim() : notice.excerpt;
    notice.publishDate = nextValues.publishDate;
    notice.isPublished = req.body.isPublished !== undefined ? normalizeBoolean(req.body.isPublished) : notice.isPublished;
    notice.featured = req.body.featured !== undefined ? normalizeBoolean(req.body.featured) : notice.featured;
    notice.updatedBy = req.user._id;
    notice.slug = await generateUniqueSlug(notice.title, notice.type, notice.publishDate, notice._id);

    if (req.file) {
      notice.image = await uploadToCloudinary(req.file.buffer, 'jmds/notices');
      if (isCloudinaryImage(oldImage)) {
        await deleteFromCloudinary(oldImage.public_id);
      }
    }

    notice = await notice.save();

    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (isCloudinaryImage(notice.image)) {
      await deleteFromCloudinary(notice.image.public_id);
    }

    await notice.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.toggleNoticePublish = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    notice.isPublished = !notice.isPublished;
    notice.updatedBy = req.user._id;
    await notice.save();

    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
