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

const BRAND: [number, number, number] = [29, 78, 216];     // primary blue
const BRAND_SOFT: [number, number, number] = [239, 244, 255];
const TEXT: [number, number, number] = [33, 37, 41];
const MUTED: [number, number, number] = [120, 125, 135];
const LINE: [number, number, number] = [220, 224, 230];
const HEAD_BG: [number, number, number] = [245, 247, 250];

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

export async function renderInvoicePdf(opts: InvoicePdfOpts) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 12;

  // ===== Top brand bar =====
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 4, "F");

  // ===== Header (logo + company + TAX INVOICE) =====
  // Logo circle
  doc.setFillColor(...BRAND_SOFT);
  doc.circle(M + 8, M + 10, 8, "F");
  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CW", M + 8, M + 12, { align: "center" });

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(COMPANY.name, M + 20, M + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let hy = M + 11;
  COMPANY.addr.forEach((l) => { doc.text(l, M + 20, hy); hy += 3.6; });
  doc.setTextColor(...BRAND);
  doc.text(COMPANY.gstin, M + 20, hy); hy += 3.6;
  doc.text(COMPANY.email, M + 20, hy); hy += 3.6;
  doc.text(COMPANY.web, M + 20, hy);

  // TAX INVOICE title with accent line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND);
  doc.text("TAX INVOICE", W - M, M + 12, { align: "right" });
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(W - M - 50, M + 14, W - M, M + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`Invoice #${opts.invoiceNo}`, W - M, M + 19, { align: "right" });

  // Divider
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, M + 32, W - M, M + 32);

  // ===== Meta block (two columns) =====
  const metaY = M + 36;
  doc.setFontSize(9);
  const metaRows: [string, string][] = [
    ["Invoice #", opts.invoiceNo],
    ["Invoice Date", format(opts.invoiceDate, "dd MMM yyyy")],
    ["Terms", opts.terms ?? "Due on Receipt"],
    ["Due Date", format(opts.dueDate, "dd MMM yyyy")],
  ];
  metaRows.forEach(([k, v], i) => {
    const y = metaY + i * 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(k, M, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text(v, M + 26, y);
  });

  // Right meta: Place of supply
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Place of Supply", W / 2 + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT);
  doc.text(opts.placeOfSupply ?? "Karnataka (29)", W / 2 + 32, metaY);

  // ===== Bill To / Ship To cards =====
  const btY = metaY + 24;
  const cardH = 38;
  const cardW = (W - 2 * M - 4) / 2;

  // Card backgrounds
  doc.setFillColor(...HEAD_BG);
  doc.roundedRect(M, btY, cardW, cardH, 1.5, 1.5, "F");
  doc.roundedRect(M + cardW + 4, btY, cardW, cardH, 1.5, 1.5, "F");

  // Labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("BILL TO", M + 3, btY + 5);
  doc.text("SHIP TO", M + cardW + 7, btY + 5);

  // Customer name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text(opts.customerName || "—", M + 3, btY + 11);
  doc.text(opts.customerName || "—", M + cardW + 7, btY + 11);

  // Addresses
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  let by = btY + 16;
  addrLines(opts.billingAddress).forEach((l) => {
    const ll = doc.splitTextToSize(l, cardW - 6);
    doc.text(ll, M + 3, by);
    by += ll.length * 4;
  });
  let sy = btY + 16;
  addrLines(opts.shippingAddress).forEach((l) => {
    const ll = doc.splitTextToSize(l, cardW - 6);
    doc.text(ll, M + cardW + 7, sy);
    sy += ll.length * 4;
  });

  // ===== Items table =====
  const tY = btY + cardH + 8;
  // Column layout (totals 186mm wide content area)
  const cx = {
    no:    { x: M,           w: 8,  align: "center" as const },
    desc:  { x: M + 8,       w: 76, align: "left"   as const },
    qty:   { x: M + 84,      w: 14, align: "right"  as const },
    rate:  { x: M + 98,      w: 22, align: "right"  as const },
    cgstP: { x: M + 120,     w: 12, align: "right"  as const },
    cgstA: { x: M + 132,     w: 18, align: "right"  as const },
    sgstP: { x: M + 150,     w: 12, align: "right"  as const },
    sgstA: { x: M + 162,     w: 18, align: "right"  as const },
    amt:   { x: M + 180,     w: 26, align: "right"  as const },
  };
  const tableW = W - 2 * M;

  // Group header band (CGST / SGST grouping)
  doc.setFillColor(...HEAD_BG);
  doc.rect(M, tY, tableW, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("CGST", cx.cgstP.x + (cx.cgstP.w + cx.cgstA.w) / 2, tY + 4, { align: "center" });
  doc.text("SGST", cx.sgstP.x + (cx.sgstP.w + cx.sgstA.w) / 2, tY + 4, { align: "center" });

  // Column header row
  doc.setFillColor(...BRAND);
  doc.rect(M, tY + 6, tableW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const hRow = tY + 11.2;
  const hText = (col: typeof cx.no, label: string) => {
    const tx = col.align === "right" ? col.x + col.w : col.align === "center" ? col.x + col.w / 2 : col.x + 1;
    doc.text(label, tx, hRow, { align: col.align });
  };
  hText(cx.no, "#");
  hText(cx.desc, "Description");
  hText(cx.qty, "Qty");
  hText(cx.rate, "Rate");
  hText(cx.cgstP, "%");
  hText(cx.cgstA, "Amt");
  hText(cx.sgstP, "%");
  hText(cx.sgstA, "Amt");
  hText(cx.amt, "Amount");

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let ry = tY + 14 + 6;
  let subTotal = 0, cgstTotal = 0, sgstTotal = 0;
  opts.items.forEach((it, idx) => {
    const amt = it.qty * it.rate;
    const cgstA = (amt * it.taxPct) / 100;
    const sgstA = (amt * it.taxPct) / 100;
    subTotal += amt; cgstTotal += cgstA; sgstTotal += sgstA;
    const dl = doc.splitTextToSize(it.description || "—", cx.desc.w - 2);
    const rowH = Math.max(dl.length * 4 + 2, 7);

    // Zebra
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(M, ry - 4, tableW, rowH, "F");
    }

    const cell = (col: typeof cx.no, txt: string | string[], color: [number, number, number] = TEXT) => {
      doc.setTextColor(...color);
      const tx = col.align === "right" ? col.x + col.w : col.align === "center" ? col.x + col.w / 2 : col.x + 1;
      doc.text(txt, tx, ry, { align: col.align });
    };
    cell(cx.no, String(idx + 1), MUTED);
    cell(cx.desc, dl, BRAND);
    cell(cx.qty, String(it.qty));
    cell(cx.rate, inr(it.rate));
    cell(cx.cgstP, it.taxPct ? `${it.taxPct}%` : "-", MUTED);
    cell(cx.cgstA, it.taxPct ? inr(cgstA) : "-");
    cell(cx.sgstP, it.taxPct ? `${it.taxPct}%` : "-", MUTED);
    cell(cx.sgstA, it.taxPct ? inr(sgstA) : "-");
    cell(cx.amt, inr(amt));

    ry += rowH;
  });

  // Bottom border on table
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, ry - 2, W - M, ry - 2);

  // ===== Totals + Words side-by-side =====
  const discountAmt = opts.discountIsPct ? (subTotal * opts.discountValue) / 100 : opts.discountValue;
  const total = Math.max(0, subTotal + cgstTotal + sgstTotal - discountAmt - opts.tdsTcsAmount + opts.adjustmentAmount);

  const sumY = ry + 6;
  // Right totals card
  const sumW = 80;
  const sumX = W - M - sumW;

  // Compute totals rows
  const tRows: Array<[string, string, "normal" | "bold"]> = [
    ["Sub Total", inr(subTotal), "normal"],
  ];
  if (cgstTotal > 0) tRows.push(["CGST", inr(cgstTotal), "normal"]);
  if (sgstTotal > 0) tRows.push(["SGST", inr(sgstTotal), "normal"]);
  if (discountAmt > 0) tRows.push([`Discount${opts.discountIsPct ? ` (${opts.discountValue}%)` : ""}`, "- " + inr(discountAmt), "normal"]);
  if (opts.tdsTcsAmount > 0) tRows.push([opts.tdsTcsLabel ?? "TDS", "- " + inr(opts.tdsTcsAmount), "normal"]);
  if (opts.adjustmentAmount !== 0) tRows.push([opts.adjustmentLabel || "Adjustment", inr(opts.adjustmentAmount), "normal"]);

  const sumH = 8 + tRows.length * 6 + 18;
  doc.setFillColor(...HEAD_BG);
  doc.roundedRect(sumX, sumY, sumW, sumH, 1.5, 1.5, "F");

  let sty = sumY + 7;
  doc.setFontSize(9);
  tRows.forEach(([k, v, weight]) => {
    doc.setFont("helvetica", weight);
    doc.setTextColor(...TEXT);
    doc.text(k, sumX + 4, sty);
    doc.text(v, sumX + sumW - 4, sty, { align: "right" });
    sty += 6;
  });

  // Total + Balance Due block
  doc.setDrawColor(...LINE);
  doc.line(sumX + 3, sty - 2, sumX + sumW - 3, sty - 2);
  sty += 2;
  doc.setFillColor(...BRAND);
  doc.rect(sumX, sty - 4, sumW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Total", sumX + 4, sty + 2);
  doc.text(`Rs. ${inr(total)}`, sumX + sumW - 4, sty + 2, { align: "right" });

  // Balance Due (below)
  const balY = sty + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("Balance Due", sumX + 4, balY);
  doc.setTextColor(...BRAND);
  doc.text(`Rs. ${inr(total)}`, sumX + sumW - 4, balY, { align: "right" });

  // ===== Left column: Total in words + Notes =====
  const leftW = sumX - M - 6;
  let ly = sumY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("TOTAL IN WORDS", M, ly); ly += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const wLines = doc.splitTextToSize(numToWords(total), leftW);
  doc.text(wLines, M, ly); ly += wLines.length * 4 + 6;

  if (opts.customerNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("NOTES", M, ly); ly += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const nLines = doc.splitTextToSize(opts.customerNotes, leftW);
    doc.text(nLines, M, ly); ly += nLines.length * 4;
  }

  // ===== Terms & Conditions (full width below) =====
  let footY = Math.max(ly, sumY + sumH) + 10;
  if (opts.termsAndConditions) {
    // Page break safety
    if (footY > H - 30) {
      doc.addPage();
      footY = M + 10;
    }
    doc.setDrawColor(...LINE);
    doc.line(M, footY - 4, W - M, footY - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("TERMS & CONDITIONS", M, footY); footY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const tLines = doc.splitTextToSize(opts.termsAndConditions, W - 2 * M);
    doc.text(tLines, M, footY);
    footY += tLines.length * 3.8;
  }

  // ===== Footer =====
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(M, H - 12, W - M, H - 12);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Thank you for your business — Cradlewell", W / 2, H - 7, { align: "center" });

  doc.save(opts.fileName);
}
