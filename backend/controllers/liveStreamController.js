const LiveStream = require('../models/liveStream');

/**
 * @route   POST /api/live/start
 * @desc    Starts a new live stream for the authenticated user's channel
 * @access  Protected
 */
/*exports.startStream = async (req, res) => {
  try {
    const { title, description, visibility } = req.body;

    if (!req.user || !req.user.channel) {
      return res.status(400).json({ success: false, message: 'Channel not found for this user' });
    }

    if (!title || !description || !visibility) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const stream = new LiveStream({
      title,
      description,
      visibility,
      hostedBy: req.user.channel._id,
      isLive: true,
      startedAt: new Date(),
    });

    await stream.save();

    console.log('🔥 Stream started by Channel:', req.user.channel.name);
    console.log('👤 User:', req.user.name);
    console.log('🎥 Channel ID:', req.user.channel._id);

    return res.status(201).json({
      success: true,
      message: 'Stream started successfully',
      stream,
    });
  } catch (err) {
    console.error('❌ Error starting stream:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while starting stream',
      error: err.message,
    });
  }
};*/
const crypto = require('crypto');

exports.startStream = async (req, res) => {
  try {
    const { title, description, visibility } = req.body;

    if (!req.user?.channel) {
      return res.status(400).json({ success: false, message: 'Channel not found' });
    }

    // Generate a unique stream key
    const streamKey = crypto.randomBytes(16).toString('hex');

    const stream = new LiveStream({
      title,
      description,
      visibility,
      hostedBy: req.user.channel._id,
      streamKey,                     // ← added
      isLive: false,                 // will become true when Nginx calls on_publish
    });

    await stream.save();

    console.log('🔥 Stream created with key:', streamKey);

    return res.status(201).json({
  success: true,
  message: 'Stream created – start pushing RTMP',
  stream,
 rtmpUrl: process.env.RTMP_SERVER_URL || 'rtmp://localhost/live',   // ← use the real IP
  streamKey,
});
  } catch (err) {
    console.error('❌ Error starting stream:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Called by Nginx when a stream starts
exports.onPublish = async (req, res) => {
  const { name } = req.body;   // Nginx sends `name` = stream key
  try {
    await LiveStream.findOneAndUpdate(
      { streamKey: name },
      { isLive: true, startedAt: new Date() }
    );
    res.status(200).end();
  } catch (err) {
    console.error('on_publish error:', err);
    res.status(500).end();
  }
};

// Called by Nginx when a stream stops
exports.onPublishDone = async (req, res) => {
  const { name } = req.body;
  try {
    await LiveStream.findOneAndUpdate(
      { streamKey: name },
      { isLive: false, endedAt: new Date() }
    );
    res.status(200).end();
  } catch (err) {
    console.error('on_publish_done error:', err);
    res.status(500).end();
  }
};
/**
 * @route   GET /api/live/:id
 * @desc    Get a live stream by its ID
 * @access  Public
 */
exports.getStreamById = async (req, res) => {
  try {
    const streamId = req.params.id;

    if (!streamId || typeof streamId !== 'string' || !streamId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid stream ID format' });
    }

    const stream = await LiveStream.findById(streamId).populate('hostedBy', 'name avatar');

    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found' });
    }

    return res.json({ success: true, stream });
  } catch (err) {
    console.error('❌ Error fetching stream:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

/**
 * @route   POST /api/live/:id/end
 * @desc    End a live stream
 * @access  Protected
 */
exports.endStream = async (req, res) => {
  try {
    const streamId = req.params.id;

    if (!streamId || typeof streamId !== 'string' || !streamId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid stream ID format' });
    }

    const stream = await LiveStream.findById(streamId);

    if (!stream) {
      return res.status(404).json({ success: false, message: 'Stream not found' });
    }

    if (!req.user || !req.user.channel || stream.hostedBy.toString() !== req.user.channel._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to end this stream' });
    }

    stream.isLive = false;
    stream.endedAt = new Date();
    await stream.save();

    console.log(`🛑 Stream ended: ${streamId}`);
    return res.json({ success: true, message: 'Stream ended successfully' });
  } catch (err) {
    console.error('❌ Error ending stream:', err);
    return res.status(500).json({ success: false, message: 'Server error while ending stream', error: err.message });
  }
};