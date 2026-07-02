const Video = require('../models/video');
const CustomError = require('../utils/customError');
const { handleAutoThumbnail } = require('./thumbnailController');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const Channel = require('../models/channel');
const { splitVideoJob } = require('../jobs/splitVideoJob');  // ✅ new
const generateThumbnail = require('../utils/generateThumbnail'); // adjust the path if needed

/*exports.handleUpload = async (req, res, next) => {
  try {
    const { title, desc, tags, visibility } = req.body;
    const videoFile = req.files?.video?.[0];    // from upload.fields
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!req.user?.channel?._id) {
      throw new CustomError('Unauthorized: You must have a channel to upload videos', 401);
    }

    if (!title || !desc || !videoFile) {   // videoFile is the file object
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
      videoPath: videoFile.path,            // original file path for transcoding
      uploadedBy: req.user.channel._id,
      status: 'processing',
    });

    const savedVideo = await video.save();

    // Start distributed transcoding
    await splitVideoJob(savedVideo._id.toString(), videoFile.path);

    res.status(201).json({
      success: true,
      message: 'Upload successful — processing started',
      data: savedVideo,
    });
  } catch (err) {
    console.error('❌ Upload error:', err.message);
    next(err);
  }
};*/

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

    // --- 1. Create video document (without thumbnail yet) ---
    const video = new Video({
      title,
      description: desc,
      tags: parsedTags,
      visibility,
      videoPath: videoFile.path,
      uploadedBy: req.user.channel._id,
      status: 'processing',
      thumbnail: null, // will fill later
    });

    const savedVideo = await video.save();

    // --- 2. Handle thumbnail ---
    let thumbnailUrl = null;
    const thumbnailsDir = path.join(__dirname, '..', 'uploads', 'thumbnails');

    if (thumbnailFile) {
      // User uploaded a custom thumbnail – move it
      const ext = path.extname(thumbnailFile.originalname);
      const thumbFilename = `thumb_${savedVideo._id}${ext}`;
      const thumbPath = path.join(thumbnailsDir, thumbFilename);
      fs.renameSync(thumbnailFile.path, thumbPath);
      thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
    } else {
      // Auto‑generate thumbnail from video
      try {
        const generatedPath = await generateThumbnail(videoFile.path, thumbnailsDir);
        // The generateThumbnail function returns the full path (e.g., .../thumb_123456.jpg)
        // We need to extract the filename and build the URL.
        const filename = path.basename(generatedPath);
        thumbnailUrl = `/uploads/thumbnails/${filename}`;
      } catch (err) {
        console.warn('⚠️ Thumbnail generation failed, using default placeholder.');
        // Optionally set a default thumbnail URL (make sure you have a default file)
        thumbnailUrl = '/uploads/thumbnails/Default_Thumbnail.jpg';
      }
    }

    // --- 3. Update video with thumbnail URL ---
    savedVideo.thumbnail = thumbnailUrl;
    await savedVideo.save();

    // --- 4. Start transcoding job ---
    await splitVideoJob(savedVideo._id.toString(), videoFile.path);

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

// videoController.js
exports.getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Try to find as a regular VOD
    let video = await Video.findById(id)
      .populate('uploadedBy', 'name username avatar');

    let isLive = false;
    let hlsUrl = null;

    if (video) {
      // It's a VOD
      isLive = video.isLive || false;
      hlsUrl = `/uploads/hls/${video.videoId || video._id}/master.m3u8`;
    } else {
      // 2. If not found, check if it's a Live Stream
      const liveStream = await LiveStream.findOne({ streamKey: id }); // or { _id: id }
      if (liveStream) {
        video = await Video.findById(liveStream.videoId).populate('uploadedBy', 'name username avatar');
        isLive = true;
        hlsUrl = `/live-hls/${liveStream.streamKey}/master.m3u8`;
      } else {
        return res.status(404).json({ success: false, message: 'Video not found' });
      }
    }

    // 3. Return unified response
    res.json({
      success: true,
      video: {
        ...video.toObject(),
        isLive,
        hlsUrl, // <-- The player uses this URL
        // Keep other fields like title, description, thumbnail, etc.
      },
    });
  } catch (err) {
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
