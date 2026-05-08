## Goal
Show payment status (Paid / Partially Paid / Unpaid) on the generated Tax Invoice so that once the customer has paid, the invoice clearly reflects it.

## Where it will appear on the invoice (3 visible cues)

1. **"PAID" stamp / badge** — top-right of the invoice, next to the "TAX INVOICE" title. A rounded pill in green when fully paid, amber when partially paid. Acts as the at-a-glance signal.

2. **Payment summary inside the totals card** — below the gradient "TOTAL PAYABLE" bar, add 3 small rows:
   - Amount Paid
   - Balance Due
   - Payment Date / Mode (e.g. "08 May 2026 · UPI · Ref: TXN12345")
   When fully paid, "Balance Due" shows ₹0.00 and the TOTAL PAYABLE bar label changes to "TOTAL (PAID)".

3. **Payment receipt note in the footer** — small confirmation line: "Payment of ₹XX,XXX received on 08 May 2026 via UPI. Thank you." Only shown when there is a recorded payment.

## Form changes (Invoice Generator UI)

Add a new "Payment Details" section in `src/routes/invoice-generator.tsx` (replacing nothing else) with:
- Payment status: Unpaid / Partial / Paid (radio)
- Amount paid (₹)
- Payment date
- Payment mode (UPI / Bank transfer / Cash / Card / Cheque)
- Reference / Transaction ID (optional)

These flow into the PDF generator.

## PDF generator changes (`src/lib/invoicePdf.ts`)

- Extend `InvoicePdfOpts` with `payment?: { status: 'paid' | 'partial' | 'unpaid'; amountPaid: number; date?: Date; mode?: string; reference?: string }`.
- Render the PAID/PARTIAL pill near the title (skip if unpaid).
- Extend the totals card with Amount Paid + Balance Due rows.
- Add the footer receipt note when `amountPaid > 0`.

## Out of scope
- No database / persistence changes.
- No automatic payment capture — user enters the payment details manually before downloading the invoice.

## Visual reference (totals card after change)
```
Subtotal              ₹50,000.00
CGST 9%                ₹4,500.00
SGST 9%                ₹4,500.00
─────────────────────────────────
TOTAL PAYABLE         ₹59,000.00   ← gradient bar
Amount Paid           ₹59,000.00
Balance Due                ₹0.00
Paid on 08 May 2026 · UPI · TXN12345
```
