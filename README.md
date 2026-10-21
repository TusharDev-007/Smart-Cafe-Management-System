# Smart Cafe Management System

A connected ordering system for cafes and restaurants. Customers scan a table QR code and order from their phone, the kitchen sees orders live, and the owner gets sales analytics.

B.Tech CSE project, SRM University Sonipat, 2026-27.
Team: Tushar Rajak, Nitin, Balwant. Supervisor: Ms. Ritu Dagar.

## Features

- **Customer app:** table QR code opens the menu in the phone browser, add to cart, place an order, track its status live.
- **Kitchen display:** live order board (New, Preparing, Ready) with sound alerts and elapsed-time warnings.
- **Admin dashboard:** sales today, orders, average order value, busiest hours, busy-hour heatmap, top items.
- **Menu manager:** add or edit items and categories, mark items sold out.
- **Table QR generator:** printable QR codes, one per table.
- **Rule-based recommendations:** explainable upsell suggestions in the cart (for example burger, then fries).
- **Security:** staff login with JWT and roles, hashed passwords, server-side price calculation, unguessable order-tracking links, login rate limiting.

Order status flow: `NEW` → `PREPARING` → `READY` → `SERVED` (or `CANCELLED`).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Recharts |
| Backend | Node.js, Express, Socket.IO |
| Data access | Prisma 6 |
| Database | MySQL 8 |
| Auth | JWT, bcrypt |

## Run it locally

Requirements: Node.js 22+, MySQL 8, Git.

### 1. Clone

```
git clone https://github.com/TusharDev-007/Smart-Cafe-Management-System
cd Smart-Cafe-Management-System
```

### 2. Create the database

```sql
CREATE DATABASE smart_cafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cafe_user'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON *.* TO 'cafe_user'@'localhost';
FLUSH PRIVILEGES;
```

(Prisma migrations need permission to create a temporary shadow database, which is why the grant is global. This is for local development only.)

### 3. Start the backend

```
cd server
copy .env.example .env
```

Edit `.env`: set the database password, and generate a secret with
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

```
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The API runs on http://localhost:5000.

### 4. Start the frontend (second terminal)

```
cd client
npm install
npm run dev
```

The app runs on http://localhost:5173.

### Optional: sample sales data for the dashboard

```
cd server
node prisma/seed-demo-orders.js           # adds about 30 days of sample orders
node prisma/seed-demo-orders.js --clear   # removes them again
```

Sample orders are marked in the database and are for development and screenshots only. They are not real measurements.

## Pages

| URL | Who | Purpose |
|---|---|---|
| `/table/:number` | Customer | Menu and ordering (opened by the table QR code) |
| `/cart` | Customer | Cart, suggestions, place order |
| `/order/:token` | Customer | Live order status |
| `/kitchen` | Kitchen or admin | Live order board |
| `/admin` | Admin | Analytics dashboard |
| `/admin/menu` | Admin | Menu manager |
| `/admin/tables` | Admin | Table QR codes |

## Development logins

Created by the seed script. **For local development only. Change them before any real deployment.**

| Role | Email | Password |
|---|---|---|
| Admin | admin@cafe.local | Admin@123 |
| Kitchen | kitchen@cafe.local | Kitchen@123 |

## Testing on a phone

Your phone and PC must be on the same Wi-Fi. Open `http://<your-PC-IP>:5173/table/5`. If it times out, allow port 5173 through Windows Firewall, and set the Wi-Fi network profile to Private. Your PC's address can change between sessions, so check it with `ipconfig`.

## Project structure

```
server/
  prisma/        schema, migrations, seed scripts
  src/
    config/      environment, recommendation rules
    controllers/ request handling
    services/    business logic (pricing, status rules, analytics)
    routes/      URL mapping
    middleware/  auth, error handling
    sockets/     Socket.IO setup and rooms
client/
  src/
    pages/       customer, kitchen, admin screens
    components/  shared UI
    context/     cart and auth state
    api/         HTTP and socket clients
```

## Roadmap

- Online payments (Razorpay test mode)
- Deployment
- Inventory alerts, customer notifications
- Multi-branch support