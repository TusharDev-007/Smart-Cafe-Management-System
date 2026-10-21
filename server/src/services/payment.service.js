const crypto = require("crypto");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const RAZORPAY_API = "https://api.razorpay.com/v1";

function isEnabled() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function assertEnabled() {
  if (!isEnabled()) throw new AppError(503, "Online payments are not available right now");
}

// The key id is public by design (the browser needs it). The secret never leaves the server.
function getPaymentConfig() {
  return { enabled: isEnabled(), keyId: isEnabled() ? env.RAZORPAY_KEY_ID : null };
}

async function createRazorpayOrder({ amountPaise, receipt }) {
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");

  let res;
  try {
    res = await fetch(`${RAZORPAY_API}/orders`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AppError(502, "Could not reach the payment provider. Please try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.id) {
    console.error("Razorpay order creation failed:", res.status, data?.error?.description);
    throw new AppError(502, "Could not start the payment. Please try again.");
  }
  return data;
}

// Razorpay signs "<razorpay_order_id>|<razorpay_payment_id>" with the key secret (HMAC SHA256)
function signatureIsValid(razorpayOrderId, razorpayPaymentId, signature) {
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Step 1: prepare a payment for an existing online order. Safe to call again for retries.
async function startCheckout(token) {
  assertEnabled();
  const order = await prisma.order.findUnique({ where: { publicToken: token } });
  if (!order) throw new AppError(404, "Order not found");
  if (order.paymentMethod !== "ONLINE") throw new AppError(409, "This order is not an online-payment order");
  if (order.paymentStatus === "PAID") throw new AppError(409, "This order is already paid");
  if (order.status !== "PENDING_PAYMENT") throw new AppError(409, "This order can no longer be paid");

  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const created = await createRazorpayOrder({
      amountPaise: order.totalPaise, // always from our database, never from the browser
      receipt: `order_${order.id}`,
    });
    razorpayOrderId = created.id;
    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId } });
  }

  return {
    keyId: env.RAZORPAY_KEY_ID,
    razorpayOrderId,
    amountPaise: order.totalPaise,
    currency: "INR",
    orderNumber: order.id,
  };
}

// Step 2: check the signature, then release the order to the kitchen
async function verifyPayment({ token, razorpayOrderId, razorpayPaymentId, signature }) {
  assertEnabled();
  const order = await prisma.order.findUnique({ where: { publicToken: token } });
  if (!order || order.razorpayOrderId !== razorpayOrderId) {
    throw new AppError(400, "Payment does not match this order");
  }
  if (!signatureIsValid(razorpayOrderId, razorpayPaymentId, signature)) {
    throw new AppError(400, "Payment verification failed");
  }

  // Atomic: only the first successful verification moves the order forward
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING_PAYMENT" },
    data: { status: "NEW", paymentStatus: "PAID", razorpayPaymentId },
  });

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: { table: true, items: true },
  });
  return { order: updated, justPaid: count === 1 };
}

module.exports = { isEnabled, getPaymentConfig, startCheckout, verifyPayment };