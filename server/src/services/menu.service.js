const prisma = require("../lib/prisma");
const AppError = require("../utils/AppError");
const rules = require("../config/recommendationRules");

const norm = (s) => s.trim().toLowerCase();

// Which recommendation rules mention this item or category name?
function rulesUsing(name) {
  const n = norm(name);
  const hit = (list = []) => list.some((x) => norm(x) === n);
  return rules
    .filter(
      (r) =>
        [r.when, r.unless].some((sel) => sel && (hit(sel.items) || hit(sel.categories))) ||
        hit(r.suggest)
    )
    .map((r) => r.id);
}

function warningFor(name) {
  const ids = rulesUsing(name);
  return ids.length
    ? [
        `Recommendation rules (${ids.join(", ")}) refer to "${name}". ` +
          `Update config/recommendationRules.js or they will stop matching.`,
      ]
    : [];
}

async function assertCategory(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, "Category not found");
}

// Everything, including sold-out items
function listAll() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { id: "asc" } } },
  });
}

async function createItem(data) {
  await assertCategory(data.categoryId);
  return prisma.menuItem.create({ data: { ...data, description: data.description || null } });
}

async function updateItem(id, data) {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Item not found");
  if (data.categoryId) await assertCategory(data.categoryId);
  if (data.description !== undefined) data.description = data.description || null;

  const item = await prisma.menuItem.update({ where: { id }, data });
  const renamed = data.name && norm(data.name) !== norm(existing.name);
  return { item, warnings: renamed ? warningFor(existing.name) : [] };
}

async function deleteItem(id) {
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Item not found");

  const used = await prisma.orderItem.count({ where: { menuItemId: id } });
  if (used > 0) {
    throw new AppError(
      409,
      "This item appears in past orders and cannot be deleted. Mark it as sold out instead."
    );
  }
  await prisma.menuItem.delete({ where: { id } });
  return { warnings: warningFor(existing.name) };
}

async function createCategory(name) {
  const last = await prisma.category.findFirst({ orderBy: { sortOrder: "desc" } });
  return prisma.category.create({ data: { name, sortOrder: (last?.sortOrder ?? 0) + 1 } });
}

async function updateCategory(id, data) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Category not found");

  const category = await prisma.category.update({ where: { id }, data });
  const renamed = data.name && norm(data.name) !== norm(existing.name);
  return { category, warnings: renamed ? warningFor(existing.name) : [] };
}

async function deleteCategory(id) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Category not found");

  const count = await prisma.menuItem.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new AppError(409, "This category still has items. Move or delete them first.");
  }
  await prisma.category.delete({ where: { id } });
  return { warnings: warningFor(existing.name) };
}

module.exports = {
  listAll,
  createItem,
  updateItem,
  deleteItem,
  createCategory,
  updateCategory,
  deleteCategory,
};