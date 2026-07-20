const Video = require('../models/video');
const CustomError = require('../utils/customError');
const { handleAutoThumbnail } = require('./thumbnailController');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const Channel = require('../models/channel');
const { splitVideoJob } = require('../jobs/splitVideoJob');
const generateThumbnail = require('../utils/generateThumbnail');
const bcrypt = require('bcryptjs');

// 🌐 Base URL for serving static files (Render or local)
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

// Helper to convert relative paths to absolute URLs
const toAbsolute = (relativePath) => {
  if (!relativePath || !relativePath.startsWith('/')) return relativePath;
  return backendUrl + relativePath;
};

// Helper to process a video object (including nested uploadedBy)
const processVideo = (video) => {
  const v = video.toObject ? video.toObject() : video;
  if (v.hlsPath) v.hlsPath = toAbsolute(v.hlsPath);
  if (v.thumbnail) v.thumbnail = toAbsolute(v.thumbnail);
  if (v.uploadedBy?.avatar) v.uploadedBy.avatar = toAbsolute(v.uploadedBy.avatar);
  return v;
};

exports.handleUpload = async (req, res, next) => {
  try {
    const { title, desc, tags, visibility } = req.body;
    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!req.user?.channel?._id) {
      throw new CustomError('Unauthorized: You must have a channel to upload videos', 401);
    }
    if (!title || !desc || !videoFile) {
      throw new CustomError('All fields are required', 400);
    }

    const parsedTags = tags ? JSON.parse(tags) : [];
    if (!Array.isArray(parsedTags) || parsedTags.length < 2) {
      throw new CustomError('Please enter at least 2 tags for suggestions', 400);
    }

    const video = new Video({
      title,
      description: desc,
      tags: parsedTags,
      visibility,
      videoPath: videoFile.path,
      uploadedBy: req.user.channel._id,
      status: 'processing',
      thumbnail: null,
    });

    const savedVideo = await video.save();

    const thumbnailsDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
    const videosDir = path.join(__dirname, '..', 'uploads', 'videos');
    const hlsDir = path.join(__dirname, '..', 'uploads', 'hls');

    [thumbnailsDir, videosDir, hlsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    let thumbnailUrl = null;

    if (thumbnailFile) {
      const ext = path.extname(thumbnailFile.originalname);
      const thumbFilename = `thumb_${savedVideo._id}${ext}`;
      const thumbPath = path.join(thumbnailsDir, thumbFilename);
      fs.renameSync(thumbnailFile.path, thumbPath);
      thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
    } else {
      try {
        const generatedPath = await generateThumbnail(videoFile.path, thumbnailsDir);
        const filename = path.basename(generatedPath);
        thumbnailUrl = `/uploads/thumbnails/${filename}`;
      } catch (err) {
        console.warn('⚠️ Thumbnail generation failed, using default placeholder.');
        thumbnailUrl = '/uploads/thumbnails/Default_Thumbnail.jpg';
      }
    }

    savedVideo.thumbnail = thumbnailUrl;
    await savedVideo.save();

    await splitVideoJob(savedVideo._id.toString(), videoFile.path);

    // ✅ Send absolute URLs in response
    const responseData = processVideo(savedVideo);

    res.status(201).json({
      success: true,
      message: 'Upload successful — processing started',
      data: responseData,
    });
  } catch (err) {
    console.error('❌ Upload error:', err.message);
    next(err);
  }
};

exports.getAllVideos = async (req, res, next) => {
  try {
    let videos = await Video.find({ visibility: 'public' })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name username avatar');

    videos = videos.map(processVideo);

    res.json({ success: true, videos });
  } catch (err) {
    next(err);
  }
};

exports.getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id)
      .select('+likedBy +dislikedBy')
      .populate('uploadedBy', 'name username avatar owner');

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (video.visibility === 'private' && req.user?.channelId !== video.uploadedBy.toString()) {
      return res.status(403).json({ success: false, message: 'This video is private' });
    }

    const userId = req.user?._id || null;
    const liked = userId ? video.likedBy.includes(userId) : false;
    const disliked = userId ? video.dislikedBy.includes(userId) : false;

    let isSubscribed = false;
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.subscribedChannels.includes(video.uploadedBy._id)) {
        isSubscribed = true;
      }
    }

    // ✅ Process video to absolute URLs
    const processed = processVideo(video);

    res.json({
      success: true,
      video: {
        ...processed,
        liked,
        disliked,
        uploadedBy: {
          ...processed.uploadedBy,
          isSubscribed,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getSuggestedVideosByTags = async (req, res, next) => {
  try {
    const videoId = req.params.videoId || req.params.id;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 5;

    const currentVideo = await Video.findById(videoId);
    if (!currentVideo) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const query = {
      _id: { $ne: videoId },
      ...(currentVideo.tags?.length > 0 ? { tags: { $in: currentVideo.tags } } : {}),
    };

    let suggestions = await Video.find(query)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name username avatar');

    suggestions = suggestions.map(processVideo);

    res.status(200).json({
      success: true,
      videos: suggestions,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (title) video.title = title;
    if (description) video.description = description;

    if (req.body.tags) {
      try {
        const parsedTags = JSON.parse(req.body.tags);
        if (Array.isArray(parsedTags)) {
          video.tags = parsedTags;
        }
      } catch (err) {
        console.warn('❌ Tag parsing failed:', err.message);
      }
    }

    if (req.file) {
      video.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    await video.save();

    const responseData = processVideo(video);

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password, pin } = req.body;

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    if (video.uploadedBy.toString() !== req.user.channel._id.toString())
      return res.status(403).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(req.user._id);

    if (user.securityPin) {
      if (!pin) return res.status(400).json({ success: false, message: 'PIN is required' });
      const pinMatch = await bcrypt.compare(pin, user.securityPin);
      if (!pinMatch) return res.status(403).json({ success: false, message: 'Wrong PIN' });
    } else {
      if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
      const passMatch = await bcrypt.compare(password, user.password || '');
      if (!passMatch) return res.status(403).json({ success: false, message: 'Wrong password' });
    }

    await Video.findByIdAndDelete(id);

    if (video.videoPath) {
      const filePath = path.join(__dirname, '..', video.videoPath);
      fs.unlink(filePath, err => {
        if (err) console.error('❌ Error deleting video file:', err.message);
      });
    } else {
      console.warn('⚠️ videoPath is undefined, skipping file deletion');
    }

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getMyUploadedVideos = async (req, res, next) => {
  try {
    const channelId = req.user.channel?._id;
    if (!channelId) {
      return res.status(403).json({ success: false, message: 'You must have a channel' });
    }

    let videos = await Video.find({ uploadedBy: channelId })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name username avatar');

    videos = videos.map(processVideo);

    res.json({ success: true, videos });
  } catch (err) {
    next(err);
  }
};

exports.getVideosByChannelUsername = async (req, res, next) => {
  try {
    const { username } = req.params;

    const channel = await Channel.findOne({ username });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    let videos = await Video.find({ uploadedBy: channel._id })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name username avatar');

    videos = videos.map(processVideo);

    res.json({ success: true, videos });
  } catch (err) {
    next(err);
  }
};

exports.getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, status: video.status });
  } catch (err) {
    next(err);
  }
};
