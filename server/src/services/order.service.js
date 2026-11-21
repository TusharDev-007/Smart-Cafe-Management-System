const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const payments = require("./payment.service");

// Status changes the kitchen may make. Online orders that are still unpaid are not theirs to
// move: only a verified online payment can release them.
const ALLOWED = {
  PENDING_PAYMENT: [],
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: [],
  CANCELLED: [],
};

const MAX_ORDER_PAISE = 500000; // Rs 5,000
const MAX_UNPAID_PER_CUSTOMER = 5;

const orderInclude = { table: true, items: true };

async function createOrder({ tableNumber = 1, customerName, items, notes, paymentMethod = "COUNTER", isPacking = false }) {
  if (paymentMethod === "ONLINE" && !payments.isEnabled()) {
    throw new AppError(503, "Online payments are not available right now");
  }

  const table = await prisma.cafeTable.findUnique({ where: { number: tableNumber } });
  if (!table || !table.isActive) throw new AppError(404, "Table not found");

  // Prices ALWAYS come from the database, never from the client.
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  let totalPaise = 0;
  const orderItems = items.map((i) => {
    const m = byId.get(i.menuItemId);
    if (!m) throw new AppError(400, `Menu item ${i.menuItemId} does not exist`);
    if (!m.isAvailable) throw new AppError(400, `${m.name} is currently unavailable`);
    totalPaise += m.pricePaise * i.quantity;
    return {
      menuItemId: m.id,
      nameSnapshot: m.name,
      unitPricePaise: m.pricePaise,
      quantity: i.quantity,
      notes: i.notes,
    };
  });

  if (totalPaise > MAX_ORDER_PAISE) {
    throw new AppError(
      400,
      `Orders above ₹${MAX_ORDER_PAISE / 100} need help from the staff. Please speak to the cashier.`
    );
  }

  // Stop one person from piling up unpaid orders (double taps, repeats)
  const unpaid = await prisma.order.count({
    where: {
      customerName,
      paymentMethod: "COUNTER",
      paymentStatus: "PENDING",
      status: { not: "CANCELLED" },
    },
  });
  if (unpaid >= MAX_UNPAID_PER_CUSTOMER) {
    throw new AppError(429, "You still have orders that are not paid. Please pay at the counter first.");
  }

  // Pay-after orders go straight to the kitchen (status NEW, payment PENDING) and are also listed
  // on the cashier screen until the cashier confirms the money. Online orders wait for Razorpay.
  return prisma.order.create({
    data: {
      tableId: table.id,
      customerName,
      totalPaise,
      notes,
      isPacking: Boolean(isPacking),
      paymentMethod,
      status: paymentMethod === "COUNTER" ? "NEW" : "PENDING_PAYMENT",
      items: { create: orderItems },
    },
    include: orderInclude,
  });
}

async function updateStatus(id, newStatus) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(404, "Order not found");
  if (!ALLOWED[order.status].includes(newStatus)) {
    throw new AppError(409, `Cannot change status from ${order.status} to ${newStatus}`);
  }
  return prisma.order.update({
    where: { id },
    data: { status: newStatus },
    include: orderInclude,
  });
}

function listActive() {
  return prisma.order.findMany({
    where: { status: { in: ["NEW", "PREPARING", "READY"] } },
    include: orderInclude,
    orderBy: { createdAt: "asc" },
  });
}

async function getById(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new AppError(404, "Order not found");
  return order;
}

async function getByToken(token) {
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found");
  return order;
}

// ---- Cashier ----

// Pay-at-counter orders whose money has not been received yet, whatever the kitchen has done
// with them. They stay here until the cashier confirms payment (there is no automatic expiry).
function listPendingCounter() {
  return prisma.order.findMany({
    where: {
      paymentMethod: "COUNTER",
      paymentStatus: "PENDING",
      status: { not: "CANCELLED" },
    },
    include: orderInclude,
    orderBy: { createdAt: "asc" },
  });
}

// The cashier has received the money: mark the order paid. The kitchen's work is not affected.
async function confirmCounterPayment(id) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(404, "Order not found");
  if (order.paymentMethod !== "COUNTER") throw new AppError(409, "This order is paid online");
  if (order.status === "CANCELLED") throw new AppError(409, "This order was cancelled.");

  // Atomic: guards against two cashiers acting at the same moment
  const { count } = await prisma.order.updateMany({
    where: { id, paymentMethod: "COUNTER", paymentStatus: "PENDING", status: { not: "CANCELLED" } },
    data: { paymentStatus: "PAID" },
  });
  if (count === 0) throw new AppError(409, "This order was already marked as paid");
  return getById(id);
}

// Fake or abandoned order: cancel it
async function rejectUnpaid(id) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(404, "Order not found");

  const { count } = await prisma.order.updateMany({
    where: { id, paymentMethod: "COUNTER", paymentStatus: "PENDING", status: { not: "CANCELLED" } },
    data: { status: "CANCELLED" },
  });
  if (count === 0) throw new AppError(409, "This order is no longer waiting for payment");
  return getById(id);
}

// Pay-after orders no longer expire. Kept as a no-op so the existing background job
// that calls it keeps working.
async function expireUnpaidCounterOrders() {
  return [];
}

module.exports = {
  createOrder,
  updateStatus,
  listActive,
  getById,
  getByToken,
  listPendingCounter,
  confirmCounterPayment,
  rejectUnpaid,
  expireUnpaidCounterOrders,
};