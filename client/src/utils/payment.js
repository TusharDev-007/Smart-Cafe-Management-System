import { startCheckout, verifyPayment } from "../api/http";

export const PAYMENT_CANCELLED = "PAYMENT_CANCELLED";

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not load the payment window. Check your internet connection."));
    document.body.appendChild(script);
  });
}

// Opens the Razorpay popup for an order. Resolves with the verified (paid) order.
export async function payForOrder(token) {
  const [session] = await Promise.all([startCheckout(token), loadRazorpay()]);

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: session.keyId,
      amount: session.amountPaise,
      currency: session.currency,
      order_id: session.razorpayOrderId,
      name: "Café",
      description: `Order #${session.orderNumber}`,
      theme: { color: "#ea580c" },
      // Called by Razorpay with the payment id and signature after a successful payment
      handler: async (response) => {
        try {
          resolve(await verifyPayment({ token, ...response }));
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error(PAYMENT_CANCELLED)) },
    });
    checkout.open();
  });
}