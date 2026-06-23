// 📁 controllers/videoController.js

const Video = require('../models/video');
const CustomError = require('../utils/customError');

exports.incrementSmartView = async (req, res, next) => {
  try {
     console.log('🚀 Smart view controller called');
    const videoId = req.params.id;
  const userId = req.user?._id;

    // ✅ Fetch video and include "viewedBy"
    const video = await Video.findById(videoId).select('+viewedBy');
    if (!video) throw new CustomError("Video not found", 404);

    // ✅ LOG after video is fetched
    console.log('🔍 User ID:', userId);
    console.log('📊 ViewedBy List:', video.viewedBy);
    console.log('✅ Already Viewed?', video.viewedBy.includes(userId));

    const alreadyViewed = video.viewedBy.some(uid => uid.toString() === userId.toString());
    if (alreadyViewed) {
      return res.status(200).json({ 
        success: true, 
        message: "View already counted", 
        views: video.views 
      });
    }

    video.views += 1;
    video.viewedBy.push(userId);
    await video.save();

    return res.status(200).json({ 
      success: true, 
      message: "Smart view counted", 
      views: video.views 
    });

  } catch (err) {
    next(err);
  }
};

exports.updateVideoVisibility = async (req, res, next) => {
  try {
    const { visibility } = req.body;
    const validOptions = ['public', 'private', 'unlisted', 'subscribers-only', 'scheduled'];

    if (!validOptions.includes(visibility)) {
      throw new CustomError('Invalid visibility option', 400);
    }

    const video = await Video.findById(req.params.id);
    if (!video) throw new CustomError('Video not found', 404);

    if (!video.uploadedBy.equals(req.user.channel._id)) {
      throw new CustomError('Unauthorized', 403);
    }

    video.visibility = visibility;
    await video.save();

    res.json({ success: true, message: 'Visibility updated', data: video });
  } catch (err) {
    next(err);
  }
};

