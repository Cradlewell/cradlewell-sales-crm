import jsPDF from "jspdf";
import { format } from "date-fns";
import logoUrl from "@/assets/cradlewell-logo.jpg";

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
  addr: [
    "Site No.26, Laskar Hosur",
    "Adugodi, Koramangala",
    "Bengaluru Karnataka 560030",
    "India",
  ],
  gstin: "GSTIN 29AALCT8756G1ZL",
  email: "care@cradlewell.com",
  web: "https://www.cradlewell.com/",
};

// All text is black. Colors below are only used for fills, borders & bands.
const BRAND: [number, number, number] = [88, 80, 236];      // indigo-violet
const BRAND_DK: [number, number, number] = [55, 48, 163];
const TEXT: [number, number, number] = [0, 0, 0];
const MUTED: [number, number, number] = [0, 0, 0];
const LINE: [number, number, number] = [210, 214, 224];
const SOFT_BG: [number, number, number] = [245, 246, 252];
const ACCENT_BG: [number, number, number] = [238, 236, 254];
const GOLD: [number, number, number] = [196, 164, 88];

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
  const W = 210, H = 297, M = 12;

  // ===== Top brand band =====
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 5, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 5, W, 0.8, "F");

  // ===== Header =====
  const headerY = 10;
  try {
    const logo = await loadImage(logoUrl);
    doc.addImage(logo, "JPEG", M, headerY, 20, 20);
  } catch { /* ignore */ }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text(COMPANY.name, M + 24, headerY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  let hy = headerY + 10;
  COMPANY.addr.forEach((l) => { doc.text(l, M + 24, hy); hy += 3.6; });
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.gstin, M + 24, hy); hy += 3.6;
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.email}  •  ${COMPANY.web}`, M + 24, hy);

  // TAX INVOICE title (no invoice # below)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("TAX INVOICE", W - M, headerY + 8, { align: "right" });
  // Decorative underline accents
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1);
  doc.line(W - M - 50, headerY + 11, W - M, headerY + 11);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(W - M - 22, headerY + 13, W - M, headerY + 13);

  // Divider
  const divY = headerY + 26;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, divY, W - M, divY);

  // ===== Meta strip =====
  const metaY = divY + 4;
  const metaH = 18;
  doc.setFillColor(...SOFT_BG);
  doc.roundedRect(M, metaY, W - 2 * M, metaH, 1.5, 1.5, "F");

  const metas: [string, string][] = [
    ["Invoice Date", format(opts.invoiceDate, "dd MMM yyyy")],
    ["Terms", opts.terms ?? "Due on Receipt"],
    ["Due Date", format(opts.dueDate, "dd MMM yyyy")],
    ["Place of Supply", opts.placeOfSupply ?? "Karnataka (29)"],
  ];
  const colW = (W - 2 * M) / metas.length;
  // Add Invoice # as the first meta column
  const metasAll: [string, string][] = [["Invoice #", opts.invoiceNo], ...metas];
  const colW2 = (W - 2 * M) / metasAll.length;
  metasAll.forEach(([k, v], i) => {
    const x = M + i * colW2 + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(k.toUpperCase(), x, metaY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(v, x, metaY + 13);
    if (i > 0) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(M + i * colW2, metaY + 3, M + i * colW2, metaY + metaH - 3);
    }
  });

  // ===== Bill To / Ship To =====
  const btY = metaY + metaH + 5;
  const btH = 34;
  const cardW = (W - 2 * M - 4) / 2;

  const drawAddrCard = (x: number, title: string, addr: Address) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, btY, cardW, btH, 1.5, 1.5, "FD");
    doc.setFillColor(...ACCENT_BG);
    doc.rect(x, btY, 2.2, btH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(title, x + 5, btY + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(opts.customerName || "—", x + 5, btY + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    let yy = btY + 16;
    addrLines(addr).forEach((l) => {
      const ll = doc.splitTextToSize(l, cardW - 8);
      doc.text(ll, x + 5, yy);
      yy += ll.length * 3.6;
    });
  };
  drawAddrCard(M, "BILL TO", opts.billingAddress);
  drawAddrCard(M + cardW + 4, "SHIP TO", opts.shippingAddress);

  // ===== Item table =====
  const tY = btY + btH + 6;
  const tableW = W - 2 * M;
  const groupH = 5;
  const headH = 8;

  // Columns (sum w = 186)
  const cx: Record<string, Col> = {
    no:    { x: M,        w: 8,  align: "center" },
    desc:  { x: M + 8,    w: 70, align: "left"   },
    qty:   { x: M + 78,   w: 12, align: "right"  },
    rate:  { x: M + 90,   w: 20, align: "right"  },
    cgstP: { x: M + 110,  w: 10, align: "right"  },
    cgstA: { x: M + 120,  w: 16, align: "right"  },
    sgstP: { x: M + 136,  w: 10, align: "right"  },
    sgstA: { x: M + 146,  w: 16, align: "right"  },
    amt:   { x: M + 162,  w: 24, align: "right"  },
  };

  // Group header band
  doc.setFillColor(...BRAND_DK);
  doc.rect(M, tY, tableW, groupH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CGST", cx.cgstP.x + (cx.cgstP.w + cx.cgstA.w) / 2, tY + 3.5, { align: "center" });
  doc.text("SGST", cx.sgstP.x + (cx.sgstP.w + cx.sgstA.w) / 2, tY + 3.5, { align: "center" });

  // Header row
  doc.setFillColor(...BRAND);
  doc.rect(M, tY + groupH, tableW, headH, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const hRow = tY + groupH + 5.5;
  const place = (col: Col, label: string, y: number) => {
    const tx = col.align === "right" ? col.x + col.w - 1 : col.align === "center" ? col.x + col.w / 2 : col.x + 1;
    doc.text(label, tx, y, { align: col.align });
  };
  place(cx.no,    "#",           hRow);
  place(cx.desc,  "DESCRIPTION", hRow);
  place(cx.qty,   "Qty",         hRow);
  place(cx.rate,  "Rate",        hRow);
  place(cx.cgstP, "%",           hRow);
  place(cx.cgstA, "Amt",         hRow);
  place(cx.sgstP, "%",           hRow);
  place(cx.sgstA, "Amt",         hRow);
  place(cx.amt,   "AMOUNT",      hRow);

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let ry = tY + groupH + headH + 5;
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0;
  opts.items.forEach((it, idx) => {
    const amt = it.qty * it.rate;
    const cgstA = (amt * it.cgstPct) / 100;
    const sgstA = (amt * it.sgstPct) / 100;
    subTotal += amt; cgstTotal += cgstA; sgstTotal += sgstA;
    const dl = doc.splitTextToSize(it.description || "—", cx.desc.w - 2);
    const rowH = Math.max(dl.length * 4, 6) + 2;
    if (idx % 2 === 1) {
      doc.setFillColor(...SOFT_BG);
      doc.rect(M, ry - 4, tableW, rowH, "F");
    }
    const cell = (col: Col, txt: string | string[]) => {
      doc.setTextColor(0, 0, 0);
      const tx = col.align === "right" ? col.x + col.w - 1 : col.align === "center" ? col.x + col.w / 2 : col.x + 1;
      doc.text(txt, tx, ry, { align: col.align });
    };
    cell(cx.no,    String(idx + 1));
    cell(cx.desc,  dl);
    cell(cx.qty,   String(it.qty));
    cell(cx.rate,  inr(it.rate));
    cell(cx.cgstP, it.cgstPct ? `${it.cgstPct}%` : "-");
    cell(cx.cgstA, it.cgstPct ? inr(cgstA) : "-");
    cell(cx.sgstP, it.sgstPct ? `${it.sgstPct}%` : "-");
    cell(cx.sgstA, it.sgstPct ? inr(sgstA) : "-");
    doc.setFont("helvetica", "bold");
    cell(cx.amt,   inr(amt));
    doc.setFont("helvetica", "normal");
    ry += rowH;
  });

  // Bottom border on table
  doc.setDrawColor(...LINE);
  doc.line(M, ry, W - M, ry);

  // ===== Totals (right) + Words (left) =====
  const discountAmt = opts.discountIsPct ? (subTotal * opts.discountValue) / 100 : opts.discountValue;
  const total = Math.max(0, subTotal + cgstTotal + sgstTotal - discountAmt - opts.tdsTcsAmount + opts.adjustmentAmount);

  // Totals card (right)
  const totW = 80;
  const totX = W - M - totW;
  let sty = ry + 8;
  const totTop = sty;
  doc.setFillColor(...SOFT_BG);
  doc.roundedRect(totX, sty, totW, 0.1, 1.5, 1.5, "F"); // placeholder; we'll redraw after computing

  // We'll draw rows first to compute height
  const rows: [string, string, boolean?][] = [];
  rows.push(["Sub Total", inr(subTotal)]);
  if (cgstTotal > 0) rows.push([`CGST${opts.items[0]?.cgstPct ? ` (${opts.items[0].cgstPct}%)` : ""}`, inr(cgstTotal)]);
  if (sgstTotal > 0) rows.push([`SGST${opts.items[0]?.sgstPct ? ` (${opts.items[0].sgstPct}%)` : ""}`, inr(sgstTotal)]);
  if (discountAmt > 0) rows.push([`Discount${opts.discountIsPct ? ` (${opts.discountValue}%)` : ""}`, "- " + inr(discountAmt)]);
  if (opts.tdsTcsAmount > 0) rows.push([opts.tdsTcsLabel ?? "TDS", "- " + inr(opts.tdsTcsAmount)]);
  if (opts.adjustmentAmount !== 0) rows.push([opts.adjustmentLabel || "Adjustment", inr(opts.adjustmentAmount)]);

  const rowsH = rows.length * 5.5 + 4;
  const totalBarH = 10;
  const cardH = rowsH + totalBarH + 4;

  // Draw card background
  doc.setFillColor(...SOFT_BG);
  doc.roundedRect(totX, totTop, totW, cardH, 1.5, 1.5, "F");

  doc.setFontSize(9);
  let yy = totTop + 6;
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(k, totX + 4, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(v, totX + totW - 4, yy, { align: "right" });
    yy += 5.5;
  });

  // Total bar — black text on light band with brand stripe
  const barY = totTop + rowsH + 2;
  doc.setFillColor(...ACCENT_BG);
  doc.roundedRect(totX, barY, totW, totalBarH, 1.5, 1.5, "F");
  doc.setFillColor(...BRAND);
  doc.rect(totX, barY, 2.2, totalBarH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Total", totX + 5, barY + 6.6);
  doc.text(`Rs. ${inr(total)}`, totX + totW - 4, barY + 6.6, { align: "right" });

  // Left: total in words
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("AMOUNT IN WORDS", M, ry + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  const wLines = doc.splitTextToSize(numToWords(total), totX - M - 6);
  doc.text(wLines, M, ry + 17);

  // ===== Terms & Conditions =====
  let footY = Math.max(totTop + cardH, ry + 17 + wLines.length * 4) + 10;
  if (opts.termsAndConditions) {
    if (footY > H - 40) { doc.addPage(); footY = M + 10; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("TERMS & CONDITIONS", M, footY);
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.6);
    doc.line(M, footY + 1.5, M + 40, footY + 1.5);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M + 40, footY + 1.5, W - M, footY + 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    const tLines = doc.splitTextToSize(opts.termsAndConditions, W - 2 * M);
    doc.text(tLines, M, footY + 6);
    footY += 6 + tLines.length * 3.8;
  }

  // ===== Footer =====
  doc.setFillColor(...GOLD);
  doc.rect(0, H - 9, W, 0.8, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, H - 8, W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Thank you for choosing Cradlewell — caring for mother & baby.", W / 2, H - 3, { align: "center" });

  doc.save(opts.fileName);
}
