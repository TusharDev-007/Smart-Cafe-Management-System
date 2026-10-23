const { z } = require("zod");
const svc = require("../services/payment.service");
const { getIO } = require("../sockets");

const tokenSchema = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);

const checkoutSchema = z.object({ token: tokenSchema });
const verifySchema = z.object({
  token: tokenSchema,
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

exports.config = (req, res) => res.json(svc.getPaymentConfig());

exports.checkout = async (req, res, next) => {
  try {
    const { token } = checkoutSchema.parse(req.body);
    res.json(await svc.startCheckout(token));
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const body = verifySchema.parse(req.body);
    const { order, justPaid } = await svc.verifyPayment({
      token: body.token,
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (justPaid) {
      const io = getIO();
      io.to("kitchen").emit("order:new", order); // now the kitchen sees it
      io.to(`order:${order.publicToken}`).emit("order:updated", order); // and the customer's other screens
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};