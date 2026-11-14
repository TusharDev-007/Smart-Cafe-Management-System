const { z } = require("zod");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");

const select = { id: true, name: true, email: true, role: true, isActive: true };
const roleEnum = z.enum(["ADMIN", "KITCHEN", "CASHIER"]);
const idSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  role: roleEnum,
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  role: roleEnum.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
});

exports.list = async (req, res, next) => {
  try {
    res.json(await prisma.user.findMany({ select, orderBy: { id: "asc" } }));
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const d = createSchema.parse(req.body);
    if (await prisma.user.findUnique({ where: { email: d.email } })) {
      throw new AppError(409, "A staff member with this email already exists");
    }
    const user = await prisma.user.create({
      data: { name: d.name, email: d.email, role: d.role, passwordHash: await bcrypt.hash(d.password, 10) },
      select,
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const d = updateSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new AppError(404, "Staff member not found");

    const myId = req.user.id ?? req.user.sub ?? req.user.userId;
    const losesAdmin =
      target.role === "ADMIN" && target.isActive &&
      ((d.role && d.role !== "ADMIN") || d.isActive === false);
    if (losesAdmin) {
      if (id === myId) throw new AppError(409, "You cannot remove your own admin access");
      const admins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (admins <= 1) throw new AppError(409, "There must be at least one active admin");
    }

    const data = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.role !== undefined) data.role = d.role;
    if (d.isActive !== undefined) data.isActive = d.isActive;
    if (d.password !== undefined) data.passwordHash = await bcrypt.hash(d.password, 10);

    res.json(await prisma.user.update({ where: { id }, data, select }));
  } catch (err) { next(err); }
};