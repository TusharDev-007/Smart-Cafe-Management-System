const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Prices are in paise: 14900 = Rs 149.00
const menu = [
  {
    category: "Burgers",
    items: [
      { name: "Classic Burger", description: "Veg patty, lettuce, tomato, house sauce", pricePaise: 14900, isVeg: true },
      { name: "Cheese Burger", description: "Double cheese slice with crispy patty", pricePaise: 17900, isVeg: true },
      { name: "Chicken Burger", description: "Grilled chicken patty with mayo", pricePaise: 18900, isVeg: false },
    ],
  },
  {
    category: "Pizza",
    items: [
      { name: "Margherita Pizza", description: "Tomato, mozzarella, basil", pricePaise: 24900, isVeg: true },
      { name: "Farmhouse Pizza", description: "Capsicum, onion, mushroom, corn", pricePaise: 29900, isVeg: true },
    ],
  },
  {
    category: "Pasta",
    items: [
      { name: "Pasta Alfredo", description: "Creamy white sauce pasta", pricePaise: 22900, isVeg: true },
      { name: "Pasta Arrabbiata", description: "Spicy tomato sauce pasta", pricePaise: 21900, isVeg: true },
    ],
  },
  {
    category: "Sandwiches",
    items: [
      { name: "Grilled Sandwich", description: "Veggies and cheese, grilled", pricePaise: 12900, isVeg: true },
      { name: "Club Sandwich", description: "Triple-layer with fries on the side", pricePaise: 16900, isVeg: true },
    ],
  },
  {
    category: "Sides",
    items: [
      { name: "French Fries", description: "Crispy salted fries", pricePaise: 8900, isVeg: true },
      { name: "Garlic Bread", description: "Toasted with garlic butter", pricePaise: 9900, isVeg: true },
    ],
  },
  {
    category: "Beverages",
    items: [
      { name: "Cappuccino", description: "Espresso with steamed milk foam", pricePaise: 11900, isVeg: true },
      { name: "Cold Coffee", description: "Chilled blended coffee", pricePaise: 12900, isVeg: true },
      { name: "Fresh Lime Soda", description: "Sweet or salted", pricePaise: 7900, isVeg: true },
    ],
  },
];

async function main() {
  // Tables 1 to 10
  for (let n = 1; n <= 10; n++) {
    await prisma.cafeTable.upsert({
      where: { number: n },
      update: {},
      create: { number: n },
    });
  }

  // Menu: only seed when empty, so re-running never creates duplicates
  const existingItems = await prisma.menuItem.count();
  if (existingItems === 0) {
    let sortOrder = 1;
    for (const group of menu) {
      const category = await prisma.category.upsert({
        where: { name: group.category },
        update: {},
        create: { name: group.category, sortOrder: sortOrder++ },
      });
      for (const item of group.items) {
        await prisma.menuItem.create({
          data: { ...item, categoryId: category.id },
        });
      }
    }
  }

  // Staff accounts (development passwords only)
  const staff = [
    { name: "Cafe Admin", email: "admin@cafe.local", password: "Admin@123", role: "ADMIN" },
    { name: "Kitchen Staff", email: "kitchen@cafe.local", password: "Kitchen@123", role: "KITCHEN" },
  ];
  for (const s of staff) {
    const passwordHash = await bcrypt.hash(s.password, 10);
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, passwordHash, role: s.role },
    });
  }

  console.log("Seed complete: 10 tables, menu, admin and kitchen users.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());