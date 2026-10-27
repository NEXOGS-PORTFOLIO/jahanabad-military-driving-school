const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notice = require('../models/Notice');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');

dotenv.config();

const createSlugBase = (title, type, publishDate) => {
  const titleSlug = (title || '')
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (titleSlug) return titleSlug;

  return `${type.toLowerCase()}-${new Date(publishDate).toISOString().slice(0, 10)}-${Date.now()}`;
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

const resolveImage = (fileNames) => {
  for (const fileName of fileNames) {
    const imagePath = path.join(__dirname, '../../docs/assets/notices', fileName);
    if (fs.existsSync(imagePath)) {
      return imagePath;
    }
  }

  return null;
};

const uploadSeedImage = async (imagePath) => {
  if (!imagePath) return undefined;
  const buffer = fs.readFileSync(imagePath);

  try {
    return await uploadToCloudinary(buffer, 'jmds/notices');
  } catch (error) {
    const uploadsDir = path.join(__dirname, '../uploads/notices');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${path.parse(imagePath).name}${path.extname(imagePath).toLowerCase()}`;
    const destination = path.join(uploadsDir, fileName);
    fs.copyFileSync(imagePath, destination);

    console.error(`Cloudinary upload failed for ${path.basename(imagePath)}. Using local upload fallback.`);
    return {
      public_id: `local:notices/${fileName}`,
      url: `/uploads/notices/${fileName}`
    };
  }
};

const initialNotices = [
  {
    type: 'Announcement',
    publishDate: '2026-04-20',
    title: '৭ম ব্যাচের কার্যক্রম শুরু হতে যাচ্ছে',
    content: '৭ ম ব্যাচ রেডি থাকুন.....৭ ম ব্যাচের কার্যক্রম শুরু হতে যাচ্ছে আগামী ২৬ তারিখ থেকে',
    excerpt: '৭ম ব্যাচের কার্যক্রম আগামী ২৬ তারিখ থেকে শুরু হতে যাচ্ছে। আগ্রহী প্রশিক্ষণার্থীদের প্রস্তুত থাকার জন্য অনুরোধ করা হচ্ছে।'
  },
  {
    type: 'Update',
    publishDate: '2026-04-16',
    title: 'কোর্স সমাপনী ও সনদপত্র বিতরণ অনুষ্ঠান',
    content: 'কোর্স সমাপনী ও সনদপত্র বিতরণ অনুষ্ঠান\n\nযানবাহন চালনা প্রশিক্ষণ কোর্স - ৬ (হালকা যান)\n\n১৬ এপ্রিল ২০২৬ তারিখ সফলভাবে কোর্স সম্পন্ন করা প্রশিক্ষণার্থীদের সনদপত্র বিতরণ ও পুরস্কার প্রদান করা হয়।',
    excerpt: 'যানবাহন চালনা প্রশিক্ষণ কোর্স - ৬ সফলভাবে সম্পন্ন করা প্রশিক্ষণার্থীদের সনদপত্র বিতরণ ও পুরস্কার প্রদান করা হয়।',
    imagePath: resolveImage(['update_1.jpeg', 'update_1.jpg'])
  },
  {
    type: 'Update',
    publishDate: '2026-03-01',
    title: 'নতুন ব্যাচের ওরিয়েন্টেশন অনুষ্ঠান',
    content: 'জাহানাবাদ মিলিটারি ড্রাইভিং স্কুলে নতুন ব্যাচের ওরিয়েন্টেশন অনুষ্ঠান অনুষ্ঠিত হয়। প্রশিক্ষণার্থীদের কোর্স কার্যক্রম, প্রশিক্ষণ পদ্ধতি, নিয়ম-শৃঙ্খলা এবং নিরাপদ যানবাহন চালনার গুরুত্ব সম্পর্কে দিকনির্দেশনা প্রদান করা হয়। নতুন ব্যাচের কার্যক্রম ১ মার্চ ২০২৬ তারিখ থেকে শুরু হয়।',
    excerpt: 'নতুন ব্যাচের ওরিয়েন্টেশন অনুষ্ঠানে প্রশিক্ষণার্থীদের কোর্স কার্যক্রম, প্রশিক্ষণ পদ্ধতি এবং নিরাপদ ড্রাইভিং সম্পর্কে নির্দেশনা প্রদান করা হয়।',
    imagePath: resolveImage(['orient_1.jpeg'])
  }
];

const seedNotices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('Please run seedAdmin.js first to create an admin user');
      process.exit(1);
    }

    let created = 0;
    let updated = 0;

    for (const item of initialNotices) {
      const existing = await Notice.findOne({ title: item.title });

      if (existing) {
        existing.type = item.type;
        existing.content = item.content;
        existing.excerpt = item.excerpt;
        existing.publishDate = item.publishDate;
        existing.isPublished = true;
        existing.updatedBy = admin._id;

        if (!existing.image?.url && item.imagePath) {
          existing.image = await uploadSeedImage(item.imagePath);
        }

        await existing.save();
        updated += 1;
        continue;
      }

      const noticeData = {
        title: item.title,
        slug: await generateUniqueSlug(item.title, item.type, item.publishDate),
        type: item.type,
        content: item.content,
        excerpt: item.excerpt,
        publishDate: item.publishDate,
        isPublished: true,
        createdBy: admin._id
      };

      if (item.imagePath) {
        noticeData.image = await uploadSeedImage(item.imagePath);
      }

      await Notice.create(noticeData);
      created += 1;
    }

    console.log(`Notice seeding completed. Created: ${created}, Updated: ${updated}`);
    console.log(`Update image found: ${Boolean(initialNotices[1].imagePath)} (${initialNotices[1].imagePath || 'missing'})`);
    console.log(`Orientation image found: ${Boolean(initialNotices[2].imagePath)} (${initialNotices[2].imagePath || 'missing'})`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding notices:', error);
    process.exit(1);
  }
};

seedNotices();
