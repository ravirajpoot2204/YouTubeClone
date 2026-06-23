const Video = require('../models/video');
const CustomError = require('../utils/customError');
const { handleAutoThumbnail } = require('./thumbnailController');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const Channel = require('../models/channel');
const addTranscodeJob = require('../jobs/transcodeUploadJob');

// ✅ Upload a new video
exports.handleUpload = async (req, res, next) => {
  try {
    const { title, desc, tags, visibility } = req.body;
    const file = req.file;

    if (!req.user?.channel?._id) {
      throw new CustomError('Unauthorized: You must have a channel to upload videos', 401);
    }

    if (!title || !desc || !file) {
      throw new CustomError('All fields are required', 400);
    }

    const parsedTags = tags ? JSON.parse(tags) : [];
    if (!Array.isArray(parsedTags) || parsedTags.length < 2) {
      throw new CustomError('Please enter at least 2 tags for suggestions', 400);
    }

    // 🛠️ Step 1: Create placeholder with empty hlsPath
    const video = new Video({
      title,
      description: desc,
      uploadedAt: new Date(),
      uploadedBy: req.user.channel._id,
      tags: parsedTags,
      visibility,
      hlsPath: 'processing', // Temporary placeholder (will be updated later)
      status: 'processing',
    });

    const savedVideo = await video.save();

    // 🧠 Step 2: Queue transcode job
    await addTranscodeJob({
      videoId: savedVideo._id.toString(),
      inputPath: file.path,
      filename: file.filename,
    });

    // ✅ Step 3: Return early
    res.status(201).json({
      success: true,
      message: 'Upload successful — processing started',
      data: savedVideo,
    });
  } catch (err) {
    console.error('❌ Upload error:', err.message);
    next(err);
  }
};


// ✅ Get all videos with channel info
exports.getAllVideos = async (req, res, next) => {
  try {
    const videos = await Video.find({ visibility: 'public' }) // ✅
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name username avatar');


    res.json({ success: true, videos });
  } catch (err) {
    next(err);
  }
};

// ✅ Get single video with like/dislike state
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

    const userId = req.user?.id || null;
    const liked = userId ? video.likedBy.includes(userId) : false;
    const disliked = userId ? video.dislikedBy.includes(userId) : false;

    // 👤 Check if current user is subscribed to the video's channel
    let isSubscribed = false;
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.subscribedChannels.includes(video.uploadedBy._id)) {
        isSubscribed = true;
      }
    }

    res.json({
      success: true,
      video: {
        ...video.toObject(),
        liked,
        disliked,
        uploadedBy: {
          ...video.uploadedBy.toObject(),
          isSubscribed,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};


// ✅ Suggested videos by tags
exports.getSuggestedVideosByTags = async (req, res, next) => {
  try {
    const { videoId } = req.params;
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

    const suggestions = await Video.find(query)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name username avatar');

    res.status(200).json({
      success: true,
      videos: suggestions,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Update video
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

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Delete video
exports.deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await Video.findByIdAndDelete(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const filePath = path.join(__dirname, '..', video.filePath);
    fs.unlink(filePath, err => {
      if (err) console.error('❌ Error deleting video file:', err.message);
    });

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ✅ Get my uploaded videos (by channel)
exports.getMyUploadedVideos = async (req, res, next) => {
  try {
    const channelId = req.user.channel?._id;
    if (!channelId) {
      return res.status(403).json({ success: false, message: 'You must have a channel' });
    }

    const videos = await Video.find({ uploadedBy: channelId })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name username avatar');

    res.json({ success: true, videos });
  } catch (err) {
    next(err);
  }
};
// 🌐 Get videos uploaded by a public channel (by username)
exports.getVideosByChannelUsername = async (req, res, next) => {
  try {
    const { username } = req.params;

    const channel = await Channel.findOne({ username });
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const videos = await Video.find({ uploadedBy: channel._id })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name username avatar');

    res.json({ success: true, videos });
  } catch (err) {
    next(err);
  }
};
// GET /api/videos/:id/status
exports.getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, status: video.status });
  } catch (err) {
    next(err);
  }
};
