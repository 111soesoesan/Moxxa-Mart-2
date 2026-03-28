"use client";

import { forwardRef } from "react";
import Image from "next/image";
import type { OrderReceiptData, ReceiptFormat, ReceiptThermalWidthMm } from "@/types/receipt";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { receiptStatusLabel } from "./receipt-status-label";

function ReceiptInvoiceA4({ data }: { data: OrderReceiptData }) {
  const shortId = data.orderId.slice(0, 8).toUpperCase();

  return (
    <div
      className="box-border bg-white text-neutral-900 print:shadow-none"
      style={{ width: "210mm", minHeight: "297mm", padding: "14mm 16mm" }}
    >
      <header className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4 min-w-0">
          {data.shopLogoUrl ? (
            <Image
              src={data.shopLogoUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              crossOrigin="anonymous"
              className="h-16 w-16 shrink-0 rounded-lg border border-neutral-100 object-contain bg-white"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
              Logo
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight">{data.shopName}</p>
            {data.shopPhone && (
              <p className="text-sm text-neutral-600 mt-0.5">{data.shopPhone}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold tracking-tight text-neutral-900">INVOICE</p>
          <p className="text-sm text-neutral-600 mt-2">
            Order <span className="font-mono font-semibold text-neutral-900">{shortId}</span>
          </p>
          <p className="text-sm text-neutral-600">{formatDateTime(data.createdAt)}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Bill to</p>
          <p className="font-semibold mt-1">{data.customerName}</p>
          <p className="text-neutral-700 mt-0.5">{data.customerPhone}</p>
          {data.customerAddress && (
            <p className="text-neutral-600 mt-1 max-w-xs">{data.customerAddress}</p>
          )}
          {data.customerEmail && (
            <p className="text-neutral-600 mt-0.5">{data.customerEmail}</p>
          )}
        </div>
        <div className="text-right space-y-1">
          <p>
            <span className="text-neutral-500">Order status: </span>
            <span className="font-medium">{receiptStatusLabel(data.orderStatus)}</span>
          </p>
          <p>
            <span className="text-neutral-500">Payment: </span>
            <span className="font-medium">{receiptStatusLabel(data.paymentStatus)}</span>
          </p>
          <p>
            <span className="text-neutral-500">Payment method: </span>
            <span className="font-medium">{data.paymentMethodName}</span>
          </p>
        </div>
      </section>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
              <th className="px-3 py-2.5 w-10">#</th>
              <th className="px-3 py-2.5">Item</th>
              <th className="px-3 py-2.5 text-right w-24">Qty</th>
              <th className="px-3 py-2.5 text-right w-28">Price</th>
              <th className="px-3 py-2.5 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-3 py-2.5 text-neutral-500">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="font-medium">{row.name}</span>
                  {row.variantLabel ? (
                    <span className="block text-xs text-neutral-500 mt-0.5">{row.variantLabel}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.quantity}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                  {formatCurrency(row.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(data.subtotal)}</span>
          </div>
          {data.shippingFee > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Shipping</span>
              <span className="tabular-nums">{formatCurrency(data.shippingFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-neutral-200 pt-2">
            <span>Total</span>
            <span className="tabular-nums text-neutral-900">{formatCurrency(data.total)}</span>
          </div>
        </div>
      </div>

      {data.notes ? (
        <div className="mt-8 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase text-neutral-500">Notes</p>
          <p className="mt-1 text-neutral-700 whitespace-pre-wrap">{data.notes}</p>
        </div>
      ) : null}

      <footer className="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
        <p className="font-semibold text-neutral-700">Moxxa Mart</p>
        <p className="mt-1">Multi-vendor marketplace</p>
        <p className="mt-0.5">This document was generated for your records.</p>
      </footer>
    </div>
  );
}

function DashedRule() {
  return (
    <div
      className="my-2 border-0 border-t border-dashed border-black"
      style={{ borderTopWidth: "1px" }}
      aria-hidden
    />
  );
}

function ReceiptThermal({
  data,
  widthMm,
}: {
  data: OrderReceiptData;
  widthMm: ReceiptThermalWidthMm;
}) {
  const w = widthMm === "80" ? "80mm" : "58mm";
  const shortId = data.orderId.slice(0, 8).toUpperCase();
  const padX = widthMm === "80" ? "3mm" : "2mm";

  return (
    <div
      className="box-border bg-white text-black font-mono text-[11px] leading-snug print:shadow-none"
      style={{ width: w, maxWidth: "100%", padding: `${padX} 4mm 6mm` }}
    >
      <div className="text-center font-bold text-sm tracking-wide">RECEIPT</div>
      <DashedRule />
      <div className="text-center font-bold uppercase">{data.shopName}</div>
      {data.shopPhone ? <div className="text-center mt-0.5">{data.shopPhone}</div> : null}
      <DashedRule />
      <div className="space-y-0.5">
        <div className="flex justify-between gap-1">
          <span>Order #</span>
          <span className="font-bold shrink-0">{shortId}</span>
        </div>
        <div className="flex justify-between gap-1">
          <span>Date</span>
          <span className="text-right shrink-0">{formatDateTime(data.createdAt)}</span>
        </div>
      </div>
      <DashedRule />
      <div className="font-bold">Customer</div>
      <div>{data.customerName}</div>
      <div>{data.customerPhone}</div>
      <DashedRule />
      <div className="font-bold mb-1">Items</div>
      <div className="space-y-2">
        {data.items.map((row, i) => (
          <div key={i}>
            <div className="font-semibold break-words">{row.name}</div>
            {row.variantLabel ? (
              <div className="text-[10px] opacity-90">{row.variantLabel}</div>
            ) : null}
            <div className="flex justify-between mt-0.5">
              <span>
                {row.quantity} × {formatCurrency(row.unitPrice)}
              </span>
              <span className="font-bold">{formatCurrency(row.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>
      <DashedRule />
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(data.subtotal)}</span>
        </div>
        {data.shippingFee > 0 ? (
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(data.shippingFee)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-xs pt-0.5">
          <span>TOTAL</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
      </div>
      <DashedRule />
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between gap-1">
          <span>Pay method</span>
          <span className="text-right font-semibold">{data.paymentMethodName}</span>
        </div>
        <div className="flex justify-between gap-1">
          <span>Order</span>
          <span className="text-right">{receiptStatusLabel(data.orderStatus)}</span>
        </div>
        <div className="flex justify-between gap-1">
          <span>Payment</span>
          <span className="text-right">{receiptStatusLabel(data.paymentStatus)}</span>
        </div>
      </div>
      <DashedRule />
      <div className="text-center text-[9px] pt-1">
        <div className="font-bold">Moxxa Mart</div>
        <div>Thank you</div>
      </div>
    </div>
  );
}

export const OrderReceiptPrintRoot = forwardRef<
  HTMLDivElement,
  {
    data: OrderReceiptData;
    format: ReceiptFormat;
    thermalWidthMm: ReceiptThermalWidthMm;
  }
>(function OrderReceiptPrintRoot({ data, format, thermalWidthMm }, ref) {
  return (
    <div ref={ref} className="receipt-print-root inline-block bg-white text-black print:bg-white">
      {format === "a4" ? (
        <ReceiptInvoiceA4 data={data} />
      ) : (
        <ReceiptThermal data={data} widthMm={thermalWidthMm} />
      )}
    </div>
  );
});
