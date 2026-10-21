const prisma = require("../lib/prisma");
const env = require("../config/env");

const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = env.TZ_OFFSET_MINUTES * 60 * 1000;

// Start of the cafe's local day, returned as a UTC Date, `daysAgo` days back
function startOfLocalDay(daysAgo = 0) {
  const localNow = Date.now() + OFFSET_MS;
  const localMidnight = Math.floor(localNow / DAY_MS) * DAY_MS;
  return new Date(localMidnight - daysAgo * DAY_MS - OFFSET_MS);
}

// Hour (0-23) and weekday (0 = Sunday) in the cafe's local time
function localParts(date) {
  const d = new Date(date.getTime() + OFFSET_MS);
  return { hour: d.getUTCHours(), weekday: d.getUTCDay() };
}

// Sales = every order that was not cancelled
function fetchSales(since) {
  return prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { createdAt: true, totalPaise: true },
  });
}

function hourlyBuckets(orders) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, salesPaise: 0 }));
  for (const o of orders) {
    const { hour } = localParts(o.createdAt);
    buckets[hour].orders += 1;
    buckets[hour].salesPaise += o.totalPaise;
  }
  return buckets;
}

// Busiest 2-hour window, e.g. 12:00-14:00
function findPeakWindow(buckets) {
  let best = null;
  for (let h = 0; h < 23; h++) {
    const total = buckets[h].orders + buckets[h + 1].orders;
    if (total > 0 && (!best || total > best.orders)) {
      best = { startHour: h, endHour: h + 2, orders: total };
    }
  }
  return best;
}

async function getSummary() {
  const todayStart = startOfLocalDay(0);
  const yesterdayStart = startOfLocalDay(1);

  const [orders30, activeOrders] = await Promise.all([
    fetchSales(startOfLocalDay(29)),
    prisma.order.count({ where: { status: { in: ["NEW", "PREPARING", "READY"] } } }),
  ]);

  let todaySalesPaise = 0;
  let todayOrders = 0;
  let yesterdaySalesPaise = 0;
  for (const o of orders30) {
    if (o.createdAt >= todayStart) {
      todaySalesPaise += o.totalPaise;
      todayOrders += 1;
    } else if (o.createdAt >= yesterdayStart) {
      yesterdaySalesPaise += o.totalPaise;
    }
  }

  return {
    todaySalesPaise,
    todayOrders,
    avgOrderPaise: todayOrders ? Math.round(todaySalesPaise / todayOrders) : 0,
    yesterdaySalesPaise,
    activeOrders,
    peakWindow: findPeakWindow(hourlyBuckets(orders30)), // based on the last 30 days
  };
}

async function getOrdersByHour(days) {
  return hourlyBuckets(await fetchSales(startOfLocalDay(days - 1)));
}

async function getHeatmap(days) {
  const orders = await fetchSales(startOfLocalDay(days - 1));
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0)); // [weekday][hour]
  for (const o of orders) {
    const { hour, weekday } = localParts(o.createdAt);
    matrix[weekday][hour] += 1;
  }
  return { days, matrix, max: Math.max(0, ...matrix.flat()) };
}

async function getTopItems(days) {
  const rows = await prisma.orderItem.groupBy({
    by: ["menuItemId", "nameSnapshot"],
    where: {
      order: { createdAt: { gte: startOfLocalDay(days - 1) }, status: { not: "CANCELLED" } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  return rows.map((r) => ({ name: r.nameSnapshot, quantity: r._sum.quantity ?? 0 }));
}

module.exports = { getSummary, getOrdersByHour, getHeatmap, getTopItems };