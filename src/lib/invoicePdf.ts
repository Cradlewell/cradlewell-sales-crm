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

export async function renderInvoicePdf(opts: {
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date;
  lead?: Lead;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  fileName: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  try {
    const img = await loadImage(templateUrl);
    doc.addImage(img, "JPEG", 0, 0, 210, 297);
  } catch { /* no bg */ }

  const { lead, qty, unitPrice, discount, description } = opts;
  const subtotal = qty * unitPrice;
  const total = Math.max(0, subtotal - discount);

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
  doc.text(lead?.name ?? "—", 18, y); y += 5;
  doc.text(`Lead ID: ${lead?.id ?? "—"}`, 18, y); y += 5;
  doc.text(`Phone: ${lead?.phone ?? "—"}`, 18, y); y += 5;
  const addr = lead?.address ?? [lead?.area, lead?.city].filter(Boolean).join(", ");
  if (addr) {
    const lines = doc.splitTextToSize(`Address: ${addr}`, 110);
    doc.text(lines, 18, y);
    y += lines.length * 5;
  }
  if (lead?.hospitalName) { doc.text(`Hospital: ${lead.hospitalName}`, 18, y); y += 5; }
  if (lead?.babyStatus) {
    const bb = `Baby: ${lead.babyStatus}${lead.babyAge ? `, ${lead.babyAge}` : ""}${lead.currentWeight ? `, ${lead.currentWeight}` : ""}`;
    doc.text(bb, 18, y); y += 5;
  }

  const rowY = 132;
  const descLines = doc.splitTextToSize(description, 90);
  doc.setFontSize(10);
  doc.text(descLines, 36, rowY);
  doc.text(`INR ${unitPrice.toLocaleString("en-IN")}`, 130, rowY, { align: "right" });
  doc.text(String(qty), 158, rowY, { align: "right" });
  doc.text(`INR ${subtotal.toLocaleString("en-IN")}`, 192, rowY, { align: "right" });

  let ty = rowY + 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, ty);
  doc.text(`INR ${subtotal.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  ty += 6;
  doc.text("Discount:", 140, ty);
  doc.text(`- INR ${discount.toLocaleString("en-IN")}`, 192, ty, { align: "right" });
  ty += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 140, ty);
  doc.text(`INR ${total.toLocaleString("en-IN")}`, 192, ty, { align: "right" });

  doc.save(opts.fileName);
}