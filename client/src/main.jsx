import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { MyOrdersProvider } from "./context/MyOrdersContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MyOrdersProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </MyOrdersProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);