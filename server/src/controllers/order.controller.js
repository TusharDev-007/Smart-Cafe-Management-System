const { z } = require("zod");
const orderService = require("../services/order.service");
const { getIO } = require("../sockets");

const createOrderSchema = z.object({
  tableNumber: z.number().int().positive(),
  notes: z.string().max(300).optional(),
  paymentMethod: z.enum(["COUNTER", "ONLINE"]).default("COUNTER"),
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
    if (order.status === "NEW") getIO().to("kitchen").emit("order:new", order);
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
    getIO().to("kitchen").to(`order:${order.publicToken}`).emit("order:updated", order);
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