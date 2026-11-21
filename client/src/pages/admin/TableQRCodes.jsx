import { QRCodeSVG } from "qrcode.react";
import AdminHeader from "../../components/AdminHeader";
import { CAFE_NAME } from "../../utils/constants";

// ONE shared QR code for the whole cart. It opens the menu; customers enter their name
// when they order. Open this page on the LIVE site (not localhost) before printing, so the
// code carries the public address.
export default function TableQRCodes() {
  const url = `${window.location.origin}/`;
  const isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden">
        <AdminHeader />
      </div>

      <main className="mx-auto max-w-md p-4">
        <div className="print:hidden">
          <h1 className="text-xl font-bold">Order QR code</h1>
          <p className="mt-1 text-sm text-gray-600">
            Print this and put it on the cart. Customers scan it, pick their food and enter their
            name.
          </p>
          {isLocal && (
            <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-700">
              You are on a local address. Open this page on the live website before printing, or the
              QR code will not work for customers.
            </p>
          )}
          <button
            onClick={() => window.print()}
            className="mt-3 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white"
          >
            Print
          </button>
        </div>

        <div className="mt-4 rounded-2xl border-2 border-orange-500 bg-white p-6 text-center shadow print:mt-0 print:shadow-none">
          <h2 className="text-2xl font-extrabold text-orange-600">{CAFE_NAME}</h2>
          <p className="mt-1 text-lg font-semibold">Scan to order</p>
          <div className="my-4 flex justify-center">
            <QRCodeSVG value={url} size={260} level="M" marginSize={2} />
          </div>
          <p className="text-sm text-gray-600">Pick your food, enter your name, pay at the counter.</p>
          <p className="mt-2 break-all text-xs text-gray-400">{url}</p>
        </div>
      </main>
    </div>
  );
}