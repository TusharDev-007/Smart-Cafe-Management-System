const { z } = require("zod");
const svc = require("../services/analytics.service");

const daysSchema = z.coerce.number().int().min(1).max(90);

exports.summary = async (req, res, next) => {
  try {
    res.json(await svc.getSummary());
  } catch (err) {
    next(err);
  }
};

exports.ordersByHour = async (req, res, next) => {
  try {
    const days = daysSchema.default(1).parse(req.query.days);
    res.json(await svc.getOrdersByHour(days));
  } catch (err) {
    next(err);
  }
};

exports.heatmap = async (req, res, next) => {
  try {
    const days = daysSchema.default(30).parse(req.query.days);
    res.json(await svc.getHeatmap(days));
  } catch (err) {
    next(err);
  }
};

exports.topItems = async (req, res, next) => {
  try {
    const days = daysSchema.default(7).parse(req.query.days);
    res.json(await svc.getTopItems(days));
  } catch (err) {
    next(err);
  }
};