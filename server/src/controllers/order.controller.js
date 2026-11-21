const { z } = require("zod");
const orderService = require("../services/order.service");
const { getIO } = require("../sockets");

const createOrderSchema = z.object({
  // Hidden: every order uses the single "cart" table, so the client no longer sends it
  tableNumber: z.number().int().positive().default(1),
  customerName: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 letters)")
    .max(30, "Name is too long (30 characters at most)")
    .regex(/^[\p{L}\p{N} .'_-]+$/u, "Use only letters, numbers and spaces in your name"),
  notes: z.string().max(300).optional(),
  paymentMethod: z.enum(["COUNTER", "ONLINE"]).default("COUNTER"),
  isPacking: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(20),
        notes: z.string().max(200).optional(),
      })
    )
    .min(1)
    .max(50),
});

const statusSchema = z.object({
  status: z.enum(["PREPARING", "READY", "SERVED", "CANCELLED"]),
});

const idSchema = z.coerce.number().int().positive();
const tokenSchema = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);

exports.createOrder = async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(data);
    // Pay-after orders reach the kitchen AND the cashier at the same moment.
    // Online orders are announced after the payment is verified.
    if (order.paymentMethod === "COUNTER") {
      const io = getIO();
      io.to("kitchen").emit("order:new", order);
      io.to("cashier").emit("order:pending", order);
    }
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { status } = statusSchema.parse(req.body);
    const order = await orderService.updateStatus(id, status);
    getIO().to("kitchen").to("cashier").to(`order:${order.publicToken}`).emit("order:updated", order);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.listActive = async (req, res, next) => {
  try {
    res.json(await orderService.listActive());
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await orderService.getById(id));
  } catch (err) {
    next(err);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const token = tokenSchema.parse(req.params.token);
    res.json(await orderService.getByToken(token));
  } catch (err) {
    next(err);
  }
};

// ---- Cashier ----

exports.listPendingPayment = async (req, res, next) => {
  try {
    res.json(await orderService.listPendingCounter());
  } catch (err) {
    next(err);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const order = await orderService.confirmCounterPayment(id);
    // Cashier screen (drops it), kitchen (UNPAID badge goes away) and the customer's phone (Paid ✓)
    getIO().to("cashier").to("kitchen").to(`order:${order.publicToken}`).emit("order:updated", order);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.rejectOrder = async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const order = await orderService.rejectUnpaid(id);
    getIO().to("cashier").to("kitchen").to(`order:${order.publicToken}`).emit("order:updated", order);
    res.json(order);
  } catch (err) {
    next(err);
  }
};