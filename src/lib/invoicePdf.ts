import jsPDF from "jspdf";
import { format } from "date-fns";
import logoUrl from "@/assets/cradlewell-logo.jpg";

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  taxPct: number;
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
  customerNotes?: string;
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

const BLUE: [number, number, number] = [37, 99, 235];
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [120, 120, 120];
const LINE: [number, number, number] = [200, 200, 200];
const HEAD_BG: [number, number, number] = [235, 235, 235];

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

  // Outer border
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(M, M, W - 2 * M, H - 2 * M);

  // ===== Header =====
  try {
    const logo = await loadImage(logoUrl);
    doc.addImage(logo, "JPEG", M + 4, M + 4, 22, 22);
  } catch { /* ignore */ }

  // Company name + address
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(COMPANY.name, M + 30, M + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let hy = M + 13;
  COMPANY.addr.forEach((l) => { doc.text(l, M + 30, hy); hy += 4; });
  doc.setTextColor(...BLUE);
  doc.text(COMPANY.gstin, M + 30, hy); hy += 4;
  doc.text(COMPANY.email, M + 30, hy); hy += 4;
  doc.text(COMPANY.web, M + 30, hy);

  // TAX INVOICE title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT);
  doc.text("TAX INVOICE", W - M - 4, M + 26, { align: "right" });

  // ===== Meta box =====
  const metaY = M + 36;
  const metaH = 26;
  doc.setDrawColor(...LINE);
  doc.line(M, metaY, W - M, metaY);
  doc.line(M, metaY + metaH, W - M, metaY + metaH);
  doc.line(W / 2, metaY, W / 2, metaY + metaH);

  doc.setFontSize(9);
  const labelX = M + 3, colonX = M + 28, valX = M + 32;
  const rows: [string, string][] = [
    ["#", opts.invoiceNo],
    ["Invoice Date", format(opts.invoiceDate, "dd/MM/yyyy")],
    ["Terms", opts.terms ?? "Due on Receipt"],
    ["Due Date", format(opts.dueDate, "dd/MM/yyyy")],
  ];
  rows.forEach(([k, v], i) => {
    const y = metaY + 6 + i * 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(k, labelX, y);
    doc.text(":", colonX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text(v, valX, y);
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Place Of Supply", W / 2 + 3, metaY + 6);
  doc.text(":", W / 2 + 36, metaY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT);
  doc.text(opts.placeOfSupply ?? "Karnataka (29)", W / 2 + 40, metaY + 6);

  // ===== Bill To / Ship To =====
  const btY = metaY + metaH;
  const btH = 32;
  doc.line(W / 2, btY, W / 2, btY + btH);
  doc.line(M, btY + btH, W - M, btY + btH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLUE);
  doc.text(opts.customerName || "—", M + 3, btY + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  let by = btY + 10;
  addrLines(opts.billingAddress).forEach((l) => {
    const ll = doc.splitTextToSize(l, W / 2 - M - 6);
    doc.text(ll, M + 3, by);
    by += ll.length * 4;
  });

  let sy = btY + 5;
  addrLines(opts.shippingAddress).forEach((l) => {
    const ll = doc.splitTextToSize(l, W / 2 - M - 6);
    doc.text(ll, W / 2 + 3, sy);
    sy += ll.length * 4;
  });

  // ===== Item table =====
  const tY = btY + btH;
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
  doc.setFillColor(...HEAD_BG);
  doc.rect(M, tY, tableW, groupH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("CGST", cx.cgstP.x + (cx.cgstP.w + cx.cgstA.w) / 2, tY + 3.5, { align: "center" });
  doc.text("SGST", cx.sgstP.x + (cx.sgstP.w + cx.sgstA.w) / 2, tY + 3.5, { align: "center" });

  // Header row
  doc.setFillColor(...HEAD_BG);
  doc.rect(M, tY + groupH, tableW, headH, "F");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const hRow = tY + groupH + 5.5;
  const place = (col: Col, label: string, y: number) => {
    const tx = col.align === "right" ? col.x + col.w - 1 : col.align === "center" ? col.x + col.w / 2 : col.x + 1;
    doc.text(label, tx, y, { align: col.align });
  };
  place(cx.no,    "#",           hRow);
  place(cx.desc,  "Description", hRow);
  place(cx.qty,   "Qty",         hRow);
  place(cx.rate,  "Rate",        hRow);
  place(cx.cgstP, "%",           hRow);
  place(cx.cgstA, "Amt",         hRow);
  place(cx.sgstP, "%",           hRow);
  place(cx.sgstA, "Amt",         hRow);
  place(cx.amt,   "Amount",      hRow);

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let ry = tY + groupH + headH + 5;
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0;
  opts.items.forEach((it, idx) => {
    const amt = it.qty * it.rate;
    const cgstA = (amt * it.taxPct) / 100;
    const sgstA = (amt * it.taxPct) / 100;
    subTotal += amt; cgstTotal += cgstA; sgstTotal += sgstA;
    const dl = doc.splitTextToSize(it.description || "—", cx.desc.w - 2);
    const cell = (col: Col, txt: string | string[], color: [number, number, number] = TEXT) => {
      doc.setTextColor(...color);
      const tx = col.align === "right" ? col.x + col.w - 1 : col.align === "center" ? col.x + col.w / 2 : col.x + 1;
      doc.text(txt, tx, ry, { align: col.align });
    };
    cell(cx.no,    String(idx + 1), BLUE);
    cell(cx.desc,  dl,              BLUE);
    cell(cx.qty,   String(it.qty));
    cell(cx.rate,  inr(it.rate));
    cell(cx.cgstP, it.taxPct ? `${it.taxPct}%` : "-", BLUE);
    cell(cx.cgstA, it.taxPct ? inr(cgstA) : "-");
    cell(cx.sgstP, it.taxPct ? `${it.taxPct}%` : "-", BLUE);
    cell(cx.sgstA, it.taxPct ? inr(sgstA) : "-");
    cell(cx.amt,   inr(amt));
    ry += Math.max(dl.length * 4, 6) + 2;
  });

  // Bottom border on table
  doc.setDrawColor(...LINE);
  doc.line(M, ry, W - M, ry);

  // ===== Totals (right) + Words/Notes (left) =====
  const discountAmt = opts.discountIsPct ? (subTotal * opts.discountValue) / 100 : opts.discountValue;
  const total = Math.max(0, subTotal + cgstTotal + sgstTotal - discountAmt - opts.tdsTcsAmount + opts.adjustmentAmount);

  // Right totals area
  const sumLeft = W / 2 + 10;
  let sty = ry + 6;
  doc.setFontSize(9);
  const totRow = (k: string, v: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...TEXT);
    doc.text(k, sumLeft, sty);
    doc.text(v, W - M - 3, sty, { align: "right" });
    sty += 5.5;
  };
  totRow("Sub Total", inr(subTotal));
  if (cgstTotal > 0) totRow(`CGST${opts.items[0]?.taxPct ? `${opts.items[0].taxPct} (${opts.items[0].taxPct}%)` : ""}`, inr(cgstTotal));
  if (sgstTotal > 0) totRow(`SGST${opts.items[0]?.taxPct ? `${opts.items[0].taxPct} (${opts.items[0].taxPct}%)` : ""}`, inr(sgstTotal));
  if (discountAmt > 0) totRow(`Discount${opts.discountIsPct ? ` (${opts.discountValue}%)` : ""}`, "- " + inr(discountAmt));
  if (opts.tdsTcsAmount > 0) totRow(opts.tdsTcsLabel ?? "TDS", "- " + inr(opts.tdsTcsAmount));
  if (opts.adjustmentAmount !== 0) totRow(opts.adjustmentLabel || "Adjustment", inr(opts.adjustmentAmount));
  totRow("Total", `Rs.${inr(total)}`, true);
  doc.setDrawColor(...LINE);
  doc.line(sumLeft - 2, sty - 3, W - M - 2, sty - 3);
  totRow("Balance Due", `Rs.${inr(total)}`, true);

  // Left: total in words + notes
  let ly = ry + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("Total In Words", M + 3, ly); ly += 5;
  doc.setFont("helvetica", "bolditalic");
  const wLines = doc.splitTextToSize(numToWords(total), W / 2 - M - 6);
  doc.text(wLines, M + 3, ly); ly += wLines.length * 4 + 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLUE);
  if (opts.customerNotes) {
    const nLines = doc.splitTextToSize(opts.customerNotes, W / 2 - M - 6);
    doc.text(nLines, M + 3, ly); ly += nLines.length * 4 + 5;
  }

  // Terms & conditions full width below
  let footY = Math.max(ly, sty) + 6;
  if (opts.termsAndConditions) {
    if (footY > H - 30) { doc.addPage(); footY = M + 10; }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    const tLines = doc.splitTextToSize(opts.termsAndConditions, W - 2 * M - 6);
    doc.text(tLines, M + 3, footY);
  }

  doc.save(opts.fileName);
}
