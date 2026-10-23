const orderService = require("../services/order.service");
const { getIO } = require("../sockets");

const INTERVAL_MS = 60 * 1000;

// Every minute, cancel counter orders that were not paid in time
function startExpiryJob() {
  setInterval(async () => {
    try {
      const expired = await orderService.expireUnpaidCounterOrders();
      for (const order of expired) {
        getIO().to("cashier").to(`order:${order.publicToken}`).emit("order:updated", order);
      }
    } catch (err) {
      console.error("Expiry job failed:", err.message);
    }
  }, INTERVAL_MS).unref();
}

module.exports = { startExpiryJob };