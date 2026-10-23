import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import MenuPage from "./pages/customer/MenuPage";
import CartPage from "./pages/customer/CartPage";
import OrderStatusPage from "./pages/customer/OrderStatusPage";
import KitchenLogin from "./pages/kitchen/KitchenLogin";
import KitchenBoard from "./pages/kitchen/KitchenBoard";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import TableQRCodes from "./pages/admin/TableQRCodes";
import MenuManager from "./pages/admin/MenuManager";
import CashierLogin from "./pages/cashier/CashierLogin";
import CashierBoard from "./pages/cashier/CashierBoard";

function Home() {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-bold">Welcome to the Café</h1>
      <p className="mt-2 text-gray-600">Please scan the QR code on your table to order.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/table/:number" element={<MenuPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/order/:token" element={<OrderStatusPage />} />

      <Route path="/kitchen/login" element={<KitchenLogin />} />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute roles={["KITCHEN", "ADMIN"]} loginPath="/kitchen/login">
            <KitchenBoard />
          </ProtectedRoute>
        }
      />
            <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]} loginPath="/admin/login">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tables"
        element={
          <ProtectedRoute roles={["ADMIN"]} loginPath="/admin/login">
            <TableQRCodes />
          </ProtectedRoute>
        }
      />
        <Route
        path="/admin/menu"
        element={
          <ProtectedRoute roles={["ADMIN"]} loginPath="/admin/login">
            <MenuManager />
          </ProtectedRoute>
        }
      />
            <Route path="/cashier/login" element={<CashierLogin />} />
      <Route
        path="/cashier"
        element={
          <ProtectedRoute roles={["CASHIER", "ADMIN"]} loginPath="/cashier/login">
            <CashierBoard />
          </ProtectedRoute>
        }
      />
    </Routes>

    
  );
}