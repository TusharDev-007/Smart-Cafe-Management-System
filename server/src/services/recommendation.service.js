const prisma = require("../lib/prisma");
const rules = require("../config/recommendationRules");

const MAX_SUGGESTIONS = 3;
const norm = (s) => s.trim().toLowerCase();

// Does a set of names/categories match a selector like { items: [...], categories: [...] }?
function matches(selector, names, categories) {
  if (!selector) return false;
  return (
    (selector.items || []).some((n) => names.has(norm(n))) ||
    (selector.categories || []).some((c) => categories.has(norm(c)))
  );
}

const namesOf = (list) => new Set(list.map((i) => norm(i.name)));
const categoriesOf = (list) => new Set(list.map((i) => norm(i.category.name)));

// cartItemIds: what is in the cart now. earlierItemIds: items from this table's earlier orders.
async function recommend(cartItemIds, earlierItemIds = []) {
  const ids = [...new Set(cartItemIds)];
  if (ids.length === 0) return [];
  const earlierIds = [...new Set(earlierItemIds)].filter((id) => !ids.includes(id));

  const [cartItems, earlierItems, menu] = await Promise.all([
    prisma.menuItem.findMany({ where: { id: { in: ids } }, include: { category: true } }),
    earlierIds.length
      ? prisma.menuItem.findMany({ where: { id: { in: earlierIds } }, include: { category: true } })
      : [],
    prisma.menuItem.findMany({ where: { isAvailable: true }, include: { category: true } }),
  ]);

  // Only the cart can TRIGGER a rule. Earlier orders can only BLOCK a suggestion.
  const cartNames = namesOf(cartItems);
  const cartCategories = categoriesOf(cartItems);

  const seen = [...cartItems, ...earlierItems];
  const seenNames = namesOf(seen);
  const seenCategories = categoriesOf(seen);
  const seenIds = new Set([...ids, ...earlierIds]);

  const menuByName = new Map(menu.map((m) => [norm(m.name), m]));

  // Collect candidates. The first rule to suggest an item wins.
  const picked = new Map(); // menuItemId -> { item, reason, priority }
  rules.forEach((rule, priority) => {
    if (!matches(rule.when, cartNames, cartCategories)) return;
    if (matches(rule.unless, seenNames, seenCategories)) return;

    for (const name of rule.suggest) {
      const item = menuByName.get(norm(name));
      if (!item || seenIds.has(item.id) || picked.has(item.id)) continue;
      picked.set(item.id, { item, reason: rule.message, priority });
    }
  });
  if (picked.size === 0) return [];

  // Tie-break within the same rule by recent popularity (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sales = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      menuItemId: { in: [...picked.keys()] },
      order: { createdAt: { gte: since }, status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } },
    },
    _sum: { quantity: true },
  });
  const popularity = new Map(sales.map((s) => [s.menuItemId, s._sum.quantity ?? 0]));

  return [...picked.values()]
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        (popularity.get(b.item.id) ?? 0) - (popularity.get(a.item.id) ?? 0)
    )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ item, reason }) => ({
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      pricePaise: item.pricePaise,
      isVeg: item.isVeg,
      reason,
    }));
}

module.exports = { recommend };