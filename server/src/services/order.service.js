const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const payments = require("./payment.service");

// Status changes the kitchen may make. Unpaid orders are not theirs to move:
// only a verified online payment or the cashier can release them.
const ALLOWED = {
  PENDING_PAYMENT: [],
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: [],
  CANCELLED: [],
};

const UNPAID_EXPIRY_MINUTES = 15; // keep in sync with client/src/utils/constants.js
const UNPAID_EXPIRY_MS = UNPAID_EXPIRY_MINUTES * 60 * 1000;
const MAX_ORDER_PAISE = 500000; // Rs 5,000
const MAX_UNPAID_PER_TABLE = 3;

const orderInclude = { table: true, items: true };

async function createOrder({ tableNumber, items, notes, paymentMethod = "COUNTER" }) {
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

  // Stop one table from flooding the cashier with unpaid orders
  const waiting = await prisma.order.count({
    where: {
      tableId: table.id,
      status: "PENDING_PAYMENT",
      createdAt: { gte: new Date(Date.now() - UNPAID_EXPIRY_MS) },
    },
  });
  if (waiting >= MAX_UNPAID_PER_TABLE) {
    throw new AppError(429, "This table already has orders waiting for payment. Please pay for them first.");
  }

  // Every order starts unpaid: online orders wait for Razorpay, counter orders wait for the cashier
  return prisma.order.create({
    data: {
      tableId: table.id,
      totalPaise,
      notes,
      paymentMethod,
      status: "PENDING_PAYMENT",
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

// Counter orders still waiting for the customer to pay
function listPendingCounter() {
  return prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      paymentMethod: "COUNTER",
      createdAt: { gte: new Date(Date.now() - UNPAID_EXPIRY_MS) },
    },
    include: orderInclude,
    orderBy: { createdAt: "asc" },
  });
}

// The cashier has received the money: release this order to the kitchen
async function confirmCounterPayment(id) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(404, "Order not found");
  if (order.paymentMethod !== "COUNTER") throw new AppError(409, "This order is paid online");
  if (order.status === "CANCELLED") {
    throw new AppError(409, "This order was cancelled or expired. Ask the customer to order again.");
  }

  // Atomic: guards against two cashiers (or the expiry job) acting at the same moment
  const { count } = await prisma.order.updateMany({
    where: { id, status: "PENDING_PAYMENT", paymentMethod: "COUNTER" },
    data: { status: "NEW", paymentStatus: "PAID" },
  });
  if (count === 0) throw new AppError(409, "This order was already confirmed");
  return getById(id);
}

// Fake or abandoned order: cancel it before any food is made
async function rejectUnpaid(id) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(404, "Order not found");

  const { count } = await prisma.order.updateMany({
    where: { id, status: "PENDING_PAYMENT", paymentMethod: "COUNTER" },
    data: { status: "CANCELLED" },
  });
  if (count === 0) throw new AppError(409, "This order is no longer waiting for payment");
  return getById(id);
}

// Cancels counter orders that were not paid in time. Returns the orders it cancelled.
async function expireUnpaidCounterOrders() {
  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      paymentMethod: "COUNTER",
      createdAt: { lt: new Date(Date.now() - UNPAID_EXPIRY_MS) },
    },
    select: { id: true },
  });

  const expired = [];
  for (const { id } of stale) {
    const { count } = await prisma.order.updateMany({
      where: { id, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
    if (count === 1) expired.push(await getById(id));
  }
  return expired;
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