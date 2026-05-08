import jsPDF from "jspdf";
import { format } from "date-fns";
import logoUrl from "@/assets/cradlewell-logo.png";

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  cgstPct: number;
  sgstPct: number;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
}

export interface InvoicePdfOpts {
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date;
  terms?: string;
  placeOfSupply?: string;
  customerName: string;
  billingAddress: Address;
  shippingAddress: Address;
  items: InvoiceItem[];
  discountValue: number;
  discountIsPct: boolean;
  tdsTcsLabel?: string;
  tdsTcsAmount: number;
  adjustmentLabel?: string;
  adjustmentAmount: number;
  termsAndConditions?: string;
  fileName: string;
}

const COMPANY = {
  name: "TENDERKIN WELLNESS PRIVATE LIMITED",
  tagline: "Your Comfort Is Our Care",
  addr: [
    "Site No.26, Laskar Hosur, Adugodi, Koramangala",
    "Bengaluru, Karnataka 560030, India",
  ],
  gstin: "GSTIN 29AALCT8756G1ZL",
  email: "care@cradlewell.com",
  web: "www.cradlewell.com",
};

// Premium healthcare palette. All text in black; colors used for fills/borders/accents.
const BLUE: [number, number, number] = [99, 136, 255];       // #6388FF soft blue
const VIOLET: [number, number, number] = [95, 71, 255];      // #5F47FF deep violet
const SOFT_BG: [number, number, number] = [247, 249, 252];   // #F7F9FC
const CARD_BG: [number, number, number] = [255, 255, 255];
const LINE: [number, number, number] = [228, 232, 240];      // thin divider
const TEXT: [number, number, number] = [17, 24, 39];
const SUB: [number, number, number] = [107, 114, 128];       // soft grey label

function inr(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numToWords(num: number): string {
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const w = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? " " + a[n%10] : "");
    if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + w(n%100) : "");
    if (n < 100000) return w(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + w(n%1000) : "");
    if (n < 10000000) return w(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + w(n%100000) : "");
    return w(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + w(n%10000000) : "");
  };
  const r = Math.floor(num);
  const p = Math.round((num - r) * 100);
  let out = "Indian Rupee " + (w(r) || "Zero");
  if (p) out += " and " + w(p) + " Paise";
  return out + " Only";
}

function addrLines(a: Address): string[] {
  const lines: string[] = [];
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  if (a.city) lines.push(a.city);
  const sp = [a.pincode, a.state].filter(Boolean).join(" ");
  if (sp) lines.push(sp);
  if (a.country) lines.push(a.country);
  if (a.phone) lines.push("Phone: " + a.phone);
  return lines;
}

type Align = "left" | "center" | "right";
interface Col { x: number; w: number; align: Align }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderInvoicePdf(opts: InvoicePdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14;

  // ===== Subtle gradient brand bar (blue → violet, simulated) =====
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(BLUE[0] + (VIOLET[0] - BLUE[0]) * t);
    const g = Math.round(BLUE[1] + (VIOLET[1] - BLUE[1]) * t);
    const b = Math.round(BLUE[2] + (VIOLET[2] - BLUE[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect((W / steps) * i, 0, W / steps + 0.2, 2.2, "F");
  }

  // ===== Header =====
  const headerY = 14;
  try {
    const logo = await loadImage(logoUrl);
    doc.addImage(logo, "PNG", M, headerY, 18, 18);
  } catch { /* ignore */ }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text(COMPANY.name, M + 22, headerY + 6);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...VIOLET);
  doc.text(COMPANY.tagline, M + 22, headerY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SUB);
  let hy = headerY + 15.5;
  COMPANY.addr.forEach((l) => { doc.text(l, M + 22, hy); hy += 3.4; });
  doc.text(`${COMPANY.gstin}  ·  ${COMPANY.email}  ·  ${COMPANY.web}`, M + 22, hy);

  // TAX INVOICE title (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...TEXT);
  doc.text("TAX INVOICE", W - M, headerY + 8, { align: "right" });
  // Gradient mini underline
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const r = Math.round(BLUE[0] + (VIOLET[0] - BLUE[0]) * t);
    const g = Math.round(BLUE[1] + (VIOLET[1] - BLUE[1]) * t);
    const b = Math.round(BLUE[2] + (VIOLET[2] - BLUE[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(W - M - 40 + i * (40 / 30), headerY + 10.5, 40 / 30 + 0.2, 1.2, "F");
  }

  // Thin divider
  const divY = headerY + 26;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(M, divY, W - M, divY);

  // ===== Meta info bar — 5 modern cards =====
  const metaY = divY + 6;
  const metaH = 16;
  const metas: [string, string][] = [
    ["INVOICE NUMBER", opts.invoiceNo],
    ["INVOICE DATE", format(opts.invoiceDate, "dd MMM yyyy")],
    ["PAYMENT TERMS", opts.terms ?? "Due on Receipt"],
    ["DUE DATE", format(opts.dueDate, "dd MMM yyyy")],
    ["PLACE OF SUPPLY", opts.placeOfSupply ?? "Karnataka (29)"],
  ];
  const gap = 2.2;
  const mCardW = (W - 2 * M - gap * (metas.length - 1)) / metas.length;
  metas.forEach(([k, v], i) => {
    const x = M + i * (mCardW + gap);
    doc.setFillColor(...SOFT_BG);
    doc.roundedRect(x, metaY, mCardW, metaH, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SUB);
    doc.text(k, x + 3, metaY + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const vL = doc.splitTextToSize(v, mCardW - 6);
    doc.text(vL[0] ?? "", x + 3, metaY + 11);
  });

  // ===== Bill To / Service Address cards =====
  const btY = metaY + metaH + 6;
  const btH = 32;
  const cardW = (W - 2 * M - 4) / 2;

  const drawAddrCard = (x: number, title: string, addr: Address) => {
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, btY, cardW, btH, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SUB);
    doc.text(title, x + 4, btY + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXT);
    doc.text(opts.customerName || "—", x + 4, btY + 11.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SUB);
    let yy = btY + 16.5;
    addrLines(addr).forEach((l) => {
      const ll = doc.splitTextToSize(l, cardW - 8);
      doc.text(ll, x + 4, yy);
      yy += ll.length * 3.6;
    });
  };
  drawAddrCard(M, "BILL TO", opts.billingAddress);
  drawAddrCard(M + cardW + 4, "SERVICE ADDRESS", opts.shippingAddress);

  // ===== Service table =====
  const tY = btY + btH + 8;
  const tableW = W - 2 * M;
  const headH = 9;

  const cx: Record<string, Col> = {
    desc:  { x: M + 3,         w: 78,  align: "left"   },
    qty:   { x: M + 81,        w: 14,  align: "right"  },
    rate:  { x: M + 95,        w: 22,  align: "right"  },
    cgst:  { x: M + 117,       w: 20,  align: "right"  },
    sgst:  { x: M + 137,       w: 20,  align: "right"  },
    amt:   { x: M + 157,       w: tableW - 160, align: "right" },
  };

  // Gradient header (blue → violet)
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    const r = Math.round(BLUE[0] + (VIOLET[0] - BLUE[0]) * t);
    const g = Math.round(BLUE[1] + (VIOLET[1] - BLUE[1]) * t);
    const b = Math.round(BLUE[2] + (VIOLET[2] - BLUE[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(M + (tableW / 60) * i, tY, tableW / 60 + 0.3, headH, "F");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const hRow = tY + 6;
  const place = (col: Col, label: string, y: number) => {
    const tx = col.align === "right" ? col.x + col.w - 1 : col.align === "center" ? col.x + col.w / 2 : col.x;
    doc.text(label, tx, y, { align: col.align });
  };
  const firstCgst = opts.items.find((i) => i.cgstPct)?.cgstPct ?? 0;
  const firstSgst = opts.items.find((i) => i.sgstPct)?.sgstPct ?? 0;
  place(cx.desc,  "DESCRIPTION", hRow);
  place(cx.qty,   "QTY",         hRow);
  place(cx.rate,  "RATE",        hRow);
  place(cx.cgst,  firstCgst ? `CGST ${firstCgst}%` : "CGST", hRow);
  place(cx.sgst,  firstSgst ? `SGST ${firstSgst}%` : "SGST", hRow);
  place(cx.amt,   "TOTAL",       hRow);

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let ry = tY + headH + 6;
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0;
  opts.items.forEach((it, idx) => {
    const amt = it.qty * it.rate;
    const cgstA = (amt * it.cgstPct) / 100;
    const sgstA = (amt * it.sgstPct) / 100;
    subTotal += amt; cgstTotal += cgstA; sgstTotal += sgstA;
    const dl = doc.splitTextToSize(it.description || "—", cx.desc.w - 2);
    const rowH = Math.max(dl.length * 4.2, 6) + 4;
    const cell = (col: Col, txt: string | string[], bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...TEXT);
      const tx = col.align === "right" ? col.x + col.w - 1 : col.align === "center" ? col.x + col.w / 2 : col.x;
      doc.text(txt, tx, ry, { align: col.align });
    };
    cell(cx.desc, dl);
    cell(cx.qty,  String(it.qty));
    cell(cx.rate, inr(it.rate));
    cell(cx.cgst, it.cgstPct ? inr(cgstA) : "—");
    cell(cx.sgst, it.sgstPct ? inr(sgstA) : "—");
    cell(cx.amt,  inr(amt), true);
    ry += rowH;
    // soft row separator
    if (idx < opts.items.length - 1) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.15);
      doc.line(M + 3, ry - 2.5, W - M - 3, ry - 2.5);
    }
  });

  // ===== Totals + Words =====
  const discountAmt = opts.discountIsPct ? (subTotal * opts.discountValue) / 100 : opts.discountValue;
  const total = Math.max(0, subTotal + cgstTotal + sgstTotal - discountAmt - opts.tdsTcsAmount + opts.adjustmentAmount);

  const totW = 78;
  const totX = W - M - totW;
  const totTop = ry + 6;

  const rows: [string, string][] = [];
  rows.push(["Subtotal", inr(subTotal)]);
  if (cgstTotal > 0) rows.push([`CGST${opts.items[0]?.cgstPct ? ` (${opts.items[0].cgstPct}%)` : ""}`, inr(cgstTotal)]);
  if (sgstTotal > 0) rows.push([`SGST${opts.items[0]?.sgstPct ? ` (${opts.items[0].sgstPct}%)` : ""}`, inr(sgstTotal)]);
  if (discountAmt > 0) rows.push([`Discount${opts.discountIsPct ? ` (${opts.discountValue}%)` : ""}`, "- " + inr(discountAmt)]);
  if (opts.tdsTcsAmount > 0) rows.push([opts.tdsTcsLabel ?? "TDS", "- " + inr(opts.tdsTcsAmount)]);
  if (opts.adjustmentAmount !== 0) rows.push([opts.adjustmentLabel || "Adjustment", inr(opts.adjustmentAmount)]);

  const rowsH = rows.length * 6 + 6;
  const totalBarH = 12;
  const cardH = rowsH + totalBarH + 4;

  doc.setFillColor(...SOFT_BG);
  doc.roundedRect(totX, totTop, totW, cardH, 2.5, 2.5, "F");

  doc.setFontSize(9);
  let yy = totTop + 7;
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUB);
    doc.text(k, totX + 5, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text(v, totX + totW - 5, yy, { align: "right" });
    yy += 6;
  });

  // Total payable — gradient bar
  const barY = totTop + rowsH;
  for (let i = 0; i < 40; i++) {
    const t = i / 39;
    const r = Math.round(BLUE[0] + (VIOLET[0] - BLUE[0]) * t);
    const g = Math.round(BLUE[1] + (VIOLET[1] - BLUE[1]) * t);
    const b = Math.round(BLUE[2] + (VIOLET[2] - BLUE[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(totX + (totW / 40) * i, barY, totW / 40 + 0.3, totalBarH, "F");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAYABLE", totX + 5, barY + 7.5);
  doc.setFontSize(12);
  doc.text(`Rs. ${inr(total)}`, totX + totW - 5, barY + 8, { align: "right" });

  // Amount in words (left)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SUB);
  doc.text("AMOUNT IN WORDS", M, totTop + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const wLines = doc.splitTextToSize(numToWords(total), totX - M - 8);
  doc.text(wLines, M, totTop + 10);

  // ===== Terms & Conditions =====
  let footY = Math.max(totTop + cardH, totTop + 10 + wLines.length * 4) + 10;
  if (opts.termsAndConditions) {
    if (footY > H - 30) { doc.addPage(); footY = M + 10; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    doc.text("TERMS & CONDITIONS", M, footY);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, footY + 2, W - M, footY + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SUB);
    const tLines = doc.splitTextToSize(opts.termsAndConditions, W - 2 * M);
    doc.text(tLines, M, footY + 7);
  }

  // ===== Footer =====
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(M, H - 14, W - M, H - 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...VIOLET);
  doc.text("For Cradlewell — Trusted Newborn Care at Home", W / 2, H - 9, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SUB);
  doc.text("This is a system-generated invoice and does not require a signature.", W / 2, H - 5, { align: "center" });

  doc.save(opts.fileName);
}
