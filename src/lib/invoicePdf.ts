import jsPDF from "jspdf";
import { format } from "date-fns";
import templateUrl from "@/assets/quotation-template.jpg";
import type { Lead } from "@/lib/types";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  taxPct: number;
}

export async function renderInvoicePdf(opts: {
  invoiceNo: string;
  orderNumber?: string;
  invoiceDate: Date;
  dueDate: Date;
  terms?: string;
  salesperson?: string;
  subject?: string;
  lead?: Lead;
  customerName?: string;
  items: InvoiceItem[];
  discountValue: number;
  discountIsPct: boolean;
  tdsTcsLabel?: string;
  tdsTcsAmount: number;
  adjustmentLabel?: string;
  adjustmentAmount: number;
  customerNotes?: string;
  termsAndConditions?: string;
  fileName: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  try {
    const img = await loadImage(templateUrl);
    doc.addImage(img, "JPEG", 0, 0, 210, 297);
  } catch { /* no bg */ }

  const { lead, items, discountValue, discountIsPct, tdsTcsAmount, adjustmentAmount } = opts;
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const taxTotal = items.reduce((s, i) => s + (i.qty * i.rate * i.taxPct) / 100, 0);
  const discountAmt = discountIsPct ? (subtotal * discountValue) / 100 : discountValue;
  const total = Math.max(0, subtotal + taxTotal - discountAmt - tdsTcsAmount + adjustmentAmount);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(opts.invoiceNo, 36, 86);
  doc.text(format(opts.invoiceDate, "dd MMM yyyy"), 96, 86);
  doc.text(format(opts.dueDate, "dd MMM yyyy"), 158, 86);

  let y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO", 18, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  doc.text(opts.customerName ?? lead?.name ?? "—", 18, y); y += 5;
  doc.text(`Lead ID: ${lead?.id ?? "—"}`, 18, y); y += 5;
  doc.text(`Phone: ${lead?.phone ?? "—"}`, 18, y); y += 5;
  const addr = lead?.address ?? [lead?.area, lead?.city].filter(Boolean).join(", ");
  if (addr) {
    const lines = doc.splitTextToSize(`Address: ${addr}`, 110);
    doc.text(lines, 18, y);
    y += lines.length * 5;
  }
  if (opts.subject) { doc.text(`Subject: ${opts.subject}`, 18, y); y += 5; }
  if (opts.salesperson) { doc.text(`Salesperson: ${opts.salesperson}`, 18, y); y += 5; }

  let rowY = 132;
  doc.setFontSize(10);
  items.forEach((it) => {
    const descLines = doc.splitTextToSize(it.description || "Item", 80);
    doc.text(descLines, 36, rowY);
    doc.text(`INR ${it.rate.toLocaleString("en-IN")}`, 128, rowY, { align: "right" });
    doc.text(String(it.qty), 152, rowY, { align: "right" });
    doc.text(`INR ${(it.qty * it.rate).toLocaleString("en-IN")}`, 192, rowY, { align: "right" });
    rowY += Math.max(6, descLines.length * 5) + 2;
  });

  let ty = Math.max(rowY + 6, 175);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, ty);
  doc.text(`INR ${subtotal.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  if (taxTotal > 0) {
    ty += 6;
    doc.text("Tax:", 140, ty);
    doc.text(`INR ${taxTotal.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  }
  if (discountAmt > 0) {
    ty += 6;
    doc.text(`Discount${discountIsPct ? ` (${discountValue}%)` : ""}:`, 140, ty);
    doc.text(`- INR ${discountAmt.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  }
  if (tdsTcsAmount > 0) {
    ty += 6;
    doc.text(`${opts.tdsTcsLabel ?? "TDS"}:`, 140, ty);
    doc.text(`- INR ${tdsTcsAmount.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  }
  if (adjustmentAmount !== 0) {
    ty += 6;
    doc.text(`Adjustment${opts.adjustmentLabel ? ` (${opts.adjustmentLabel})` : ""}:`, 140, ty);
    doc.text(`INR ${adjustmentAmount.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  }
  ty += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total (₹):", 140, ty);
  doc.text(`INR ${total.toLocaleString("en-IN")}`, 192, ty, { align: "right" });

  // Customer notes & T&C (lower portion)
  let footY = ty + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (opts.customerNotes) {
    doc.text("Customer Notes:", 18, footY); footY += 5;
    doc.setFont("helvetica", "normal");
    const nLines = doc.splitTextToSize(opts.customerNotes, 175);
    doc.text(nLines, 18, footY);
    footY += nLines.length * 4 + 4;
  }
  if (opts.termsAndConditions) {
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", 18, footY); footY += 5;
    doc.setFont("helvetica", "normal");
    const tLines = doc.splitTextToSize(opts.termsAndConditions, 175);
    doc.text(tLines, 18, footY);
  }

  doc.save(opts.fileName);
}