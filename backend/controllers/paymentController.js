const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLATFORM_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || 30) / 100;

// Create Razorpay order
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    const options = {
      amount: amount * 100,   // Razorpay expects paise
      currency,
      receipt,
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ success: false, message: 'Order creation failed' });
  }
};

// Verify payment signature
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign === razorpay_signature) {
      // Payment is authentic
      res.json({ success: true, message: 'Payment verified' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// Helper to calculate earnings (can be used when saving message)
exports.calculateEarnings = (amount) => {
  const platformFee = Math.round(amount * PLATFORM_PERCENT * 100) / 100;
  const creatorEarning = amount - platformFee;
  return { platformFee, creatorEarning };
};