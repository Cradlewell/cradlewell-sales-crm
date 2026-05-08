import jsPDF from "jspdf";
import { format } from "date-fns";

export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  taxPct: number; // CGST% (SGST mirrored)
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

const BLUE: [number, number, number] = [29, 78, 216];
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [110, 110, 110];

function inr(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numToWords(num: number): string {
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? " " + a[n%10] : "");
    if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + inWords(n%100) : "");
    if (n < 100000) return inWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + inWords(n%1000) : "");
    if (n < 10000000) return inWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + inWords(n%100000) : "");
    return inWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + inWords(n%10000000) : "");
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let out = "Indian Rupee " + (inWords(rupees) || "Zero");
  if (paise) out += " and " + inWords(paise) + " Paise";
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

export async function renderInvoicePdf(opts: InvoicePdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 12;

  // Outer border
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(M, M, W - 2 * M, 273);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(COMPANY.name, M + 28, M + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let hy = M + 13;
  COMPANY.addr.forEach((l) => { doc.text(l, M + 28, hy); hy += 4; });
  doc.setTextColor(...BLUE);
  doc.text(COMPANY.gstin, M + 28, hy); hy += 4;
  doc.text(COMPANY.email, M + 28, hy); hy += 4;
  doc.text(COMPANY.web, M + 28, hy);

  // Title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  doc.text("TAX INVOICE", W - M - 4, M + 20, { align: "right" });

  // Invoice meta box
  const metaY = M + 38;
  doc.setDrawColor(200);
  doc.line(M, metaY, W - M, metaY);
  doc.line(M, metaY + 26, W - M, metaY + 26);
  doc.line(W / 2, metaY, W / 2, metaY + 26);

  doc.setFontSize(9);
  const labelX = M + 3, colonX = M + 28, valX = M + 30;
  const rows = [
    ["#", opts.invoiceNo, true],
    ["Invoice Date", format(opts.invoiceDate, "dd/MM/yyyy"), true],
    ["Terms", opts.terms ?? "Due on Receipt", true],
    ["Due Date", format(opts.dueDate, "dd/MM/yyyy"), true],
  ] as const;
  rows.forEach(([k, v, bold], i) => {
    const y = metaY + 6 + i * 5;
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(k, labelX, y);
    doc.text(":", colonX, y);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(v, valX, y);
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Place Of Supply", W / 2 + 3, metaY + 6);
  doc.text(":", W / 2 + 36, metaY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT);
  doc.text(opts.placeOfSupply ?? "Karnataka (29)", W / 2 + 38, metaY + 6);

  // Bill To / Ship To
  const btY = metaY + 26;
  doc.line(W / 2, btY, W / 2, btY + 32);
  doc.line(M, btY + 32, W - M, btY + 32);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLUE);
  doc.text(opts.customerName || "—", M + 3, btY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  let by = btY + 10;
  addrLines(opts.billingAddress).forEach((l) => {
    const ll = doc.splitTextToSize(l, 90);
    doc.text(ll, M + 3, by);
    by += ll.length * 4;
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  let sy = btY + 5;
  addrLines(opts.shippingAddress).forEach((l) => {
    const ll = doc.splitTextToSize(l, 90);
    doc.text(ll, W / 2 + 3, sy);
    sy += ll.length * 4;
  });

  // Item table
  const tY = btY + 32;
  const headerH = 10;
  doc.setFillColor(235, 235, 235);
  doc.rect(M, tY, W - 2 * M, headerH, "F");

  // Columns
  const cols = {
    no: M + 4,
    desc: M + 14,
    qty: M + 92,
    rate: M + 110,
    cgstP: M + 130,
    cgstA: M + 142,
    sgstP: M + 158,
    sgstA: M + 170,
    amt: W - M - 4,
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  // Group headers CGST / SGST
  doc.text("CGST", M + 130, tY + 4);
  doc.text("SGST", M + 158, tY + 4);
  doc.text("#", cols.no, tY + 8, { align: "center" });
  doc.text("Description", cols.desc, tY + 8);
  doc.text("Qty", cols.qty, tY + 8, { align: "right" });
  doc.text("Rate", cols.rate, tY + 8, { align: "right" });
  doc.text("%", cols.cgstP, tY + 8, { align: "right" });
  doc.text("Amt", cols.cgstA, tY + 8, { align: "right" });
  doc.text("%", cols.sgstP, tY + 8, { align: "right" });
  doc.text("Amt", cols.sgstA, tY + 8, { align: "right" });
  doc.text("Amount", cols.amt, tY + 8, { align: "right" });

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  let ry = tY + headerH + 6;
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0;
  opts.items.forEach((it, idx) => {
    const amt = it.qty * it.rate;
    const cgstA = (amt * it.taxPct) / 100;
    const sgstA = (amt * it.taxPct) / 100;
    subTotal += amt; cgstTotal += cgstA; sgstTotal += sgstA;
    const dl = doc.splitTextToSize(it.description || "—", 72);
    doc.setTextColor(...BLUE);
    doc.text(String(idx + 1), cols.no, ry, { align: "center" });
    doc.text(dl, cols.desc, ry);
    doc.setTextColor(...TEXT);
    doc.text(String(it.qty), cols.qty, ry, { align: "right" });
    doc.text(inr(it.rate), cols.rate, ry, { align: "right" });
    doc.text(it.taxPct ? `${it.taxPct}%` : "-", cols.cgstP, ry, { align: "right" });
    doc.text(it.taxPct ? inr(cgstA) : "-", cols.cgstA, ry, { align: "right" });
    doc.text(it.taxPct ? `${it.taxPct}%` : "-", cols.sgstP, ry, { align: "right" });
    doc.text(it.taxPct ? inr(sgstA) : "-", cols.sgstA, ry, { align: "right" });
    doc.text(inr(amt), cols.amt, ry, { align: "right" });
    ry += Math.max(dl.length * 4, 6) + 2;
  });
  ry += 2;
  doc.setDrawColor(200);
  doc.line(M, ry, W - M, ry);

  // Totals + words
  const discountAmt = opts.discountIsPct ? (subTotal * opts.discountValue) / 100 : opts.discountValue;
  const total = Math.max(0, subTotal + cgstTotal + sgstTotal - discountAmt - opts.tdsTcsAmount + opts.adjustmentAmount);

  // Right totals box
  const totalsX = W - M - 75;
  let ty = ry + 6;
  doc.setFontSize(9);
  const totRow = (l: string, v: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...TEXT);
    doc.text(l, totalsX, ty);
    doc.text(v, W - M - 4, ty, { align: "right" });
    ty += 5;
  };
  totRow("Sub Total", inr(subTotal));
  if (cgstTotal > 0) totRow(`CGST`, inr(cgstTotal));
  if (sgstTotal > 0) totRow(`SGST`, inr(sgstTotal));
  if (discountAmt > 0) totRow(`Discount${opts.discountIsPct ? ` (${opts.discountValue}%)` : ""}`, "- " + inr(discountAmt));
  if (opts.tdsTcsAmount > 0) totRow(opts.tdsTcsLabel ?? "TDS", "- " + inr(opts.tdsTcsAmount));
  if (opts.adjustmentAmount !== 0) totRow(opts.adjustmentLabel || "Adjustment", inr(opts.adjustmentAmount));
  ty += 1;
  doc.setDrawColor(200);
  doc.line(totalsX - 2, ty - 3, W - M - 2, ty - 3);
  totRow("Total", "Rs. " + inr(total), true);
  doc.setFont("helvetica", "bold");
  doc.text("Balance Due", totalsX, ty + 2);
  doc.text("Rs. " + inr(total), W - M - 4, ty + 2, { align: "right" });

  // Left: total in words + notes
  let ly = ry + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("Total In Words", M + 3, ly); ly += 5;
  doc.setFont("helvetica", "italic");
  const wLines = doc.splitTextToSize(numToWords(total), 110);
  doc.text(wLines, M + 3, ly); ly += wLines.length * 4 + 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLUE);
  if (opts.customerNotes) {
    const nLines = doc.splitTextToSize(opts.customerNotes, 110);
    doc.text(nLines, M + 3, ly); ly += nLines.length * 4 + 4;
  }
  // Use max(ly, ty)
  let footY = Math.max(ly, ty + 8);

  if (opts.termsAndConditions) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLUE);
    const tLines = doc.splitTextToSize(opts.termsAndConditions, W - 2 * M - 6);
    doc.text(tLines, M + 3, footY);
  }

  doc.save(opts.fileName);
}
