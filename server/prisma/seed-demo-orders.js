const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TAG = "[demo]"; // stored in `notes` so demo orders can be deleted safely
const OFFSET_MS = 330 * 60 * 1000; // IST
const DAY_MS = 24 * 60 * 60 * 1000;

// Relative chance of an order in each local hour
const HOUR_WEIGHT = { 8: 2, 9: 3, 10: 4, 11: 6, 12: 12, 13: 14, 14: 8, 15: 4, 16: 5, 17: 7, 18: 10, 19: 11, 20: 8, 21: 4 };
const hours = Object.keys(HOUR_WEIGHT).map(Number);
const totalWeight = hours.reduce((s, h) => s + HOUR_WEIGHT[h], 0);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function pickHour() {
  let r = Math.random() * totalWeight;
  for (const h of hours) {
    r -= HOUR_WEIGHT[h];
    if (r <= 0) return h;
  }
  return hours[hours.length - 1];
}

async function main() {
  if (process.argv.includes("--clear")) {
    const res = await prisma.order.deleteMany({ where: { notes: TAG } });
    console.log(`Removed ${res.count} demo orders.`);
    return;
  }

  const tables = await prisma.cafeTable.findMany();
  const menu = await prisma.menuItem.findMany();
  if (!tables.length || !menu.length) throw new Error("Run `npx prisma db seed` first.");

  const localNow = Date.now() + OFFSET_MS;
  const localMidnight = Math.floor(localNow / DAY_MS) * DAY_MS;
  let created = 0;

  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const dayStart = localMidnight - daysAgo * DAY_MS - OFFSET_MS; // UTC ms of local midnight
    const weekday = new Date(localMidnight - daysAgo * DAY_MS).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const ordersToday = rand(18, 30) + (weekend ? 10 : 0);

    for (let i = 0; i < ordersToday; i++) {
      const createdAt = new Date(dayStart + (pickHour() * 60 + rand(0, 59)) * 60000);

      const picks = [...menu].sort(() => Math.random() - 0.5).slice(0, rand(1, 4));
      const lines = picks.map((m) => ({
        menuItemId: m.id,
        nameSnapshot: m.name,
        unitPricePaise: m.pricePaise,
        quantity: rand(1, 2),
      }));
      const totalPaise = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);

      await prisma.order.create({
        data: {
          tableId: tables[rand(0, tables.length - 1)].id,
          status: "SERVED",
          paymentStatus: "PAID",
          totalPaise,
          notes: TAG,
          createdAt,
          items: { create: lines },
        },
      });
      created++;
    }
  }
  console.log(`Created ${created} demo orders over the last 30 days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());