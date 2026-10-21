const payments = require("./payment.service");
const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

// Which status changes are legal
const ALLOWED = {
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: [],
  CANCELLED: [],
  PENDING_PAYMENT: [],
};

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

  return prisma.order.create({
    data: {
      tableId: table.id,
      totalPaise,
      notes,
      paymentMethod,
      // Online orders wait for a verified payment before the kitchen sees them
      status: paymentMethod === "ONLINE" ? "PENDING_PAYMENT" : "NEW",
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
module.exports = { createOrder, updateStatus, listActive, getById, getByToken };