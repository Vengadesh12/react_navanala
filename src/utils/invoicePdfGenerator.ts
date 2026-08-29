import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceDto } from "../types/invoice";

/**
 * Generates and downloads a clean, professional vector Tax Invoice PDF.
 */
export const downloadInvoicePdf = (invoice: InvoiceDto): void => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryDark = [30, 27, 75]; // #1e1b4b
  const primaryIndigo = [67, 56, 202]; // #4338ca
  const textDark = [15, 23, 42]; // #0f172a
  const textMuted = [100, 116, 139]; // #64748b
  const bgLight = [248, 250, 252]; // #f8fafc
  const borderColor = [226, 232, 240]; // #e2e8f0

  // Format INR Helper (using Rs. prefix to ensure universal font compatibility in standard PDF fonts)
  const formatMoney = (val?: number) => {
    const num = val || 0;
    return "Rs. " + num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  let cursorY = margin;

  // 1. Top Decorative Header Accent Bar
  doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.rect(margin, cursorY, contentWidth, 3, "F");
  cursorY += 8;

  // 2. Company Brand & Document Title
  // Left: Company Identity
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text("NAVANALA TECHNOLOGIES", margin, cursorY);

  cursorY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Enterprise Cloud & IT Solutions", margin, cursorY);

  cursorY += 4;
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`GSTIN: ${invoice.companyGstin || "36AAAAA0000A1Z5"}  |  State: 36 (Telangana)`, margin, cursorY);

  // Right: Tax Invoice Badge & Details
  const rightX = pageWidth - margin;
  let rightY = margin + 8;

  // TAX INVOICE Header
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(rightX - 36, rightY - 4.5, 36, 6.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", rightX - 18, rightY, { align: "center" });

  rightY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`#${invoice.invoiceNumber}`, rightX, rightY, { align: "right" });

  rightY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Invoice Date: `, rightX - 25, rightY, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${formatDate(invoice.invoiceDate)}`, rightX, rightY, { align: "right" });

  if (invoice.dueDate) {
    rightY += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Due Date: `, rightX - 25, rightY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(`${formatDate(invoice.dueDate)}`, rightX, rightY, { align: "right" });
  }

  // Status Stamp Badge
  rightY += 4;
  const statusStr = (invoice.status || "DRAFT").toUpperCase();
  if (statusStr === "PAID") {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setTextColor(4, 120, 87); // emerald-700
  } else if (statusStr === "PENDING") {
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setTextColor(180, 83, 9); // amber-700
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(244, 63, 94); // rose-500
    doc.setTextColor(190, 18, 60); // rose-700
  }
  doc.roundedRect(rightX - 30, rightY - 3, 30, 5, 1, 1, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(statusStr, rightX - 15, rightY + 0.5, { align: "center" });

  cursorY = Math.max(cursorY + 6, rightY + 6);

  // Divider line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // 3. Dual Party Details Cards: Billed To & Billed From
  const colWidth = (contentWidth - 6) / 2;
  const cardHeight = 32;

  // Left Card: Billed To (Client)
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, cursorY, colWidth, cardHeight, 2, 2, "FD");

  let billY = cursorY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("BILLED TO (CUSTOMER / CLIENT):", margin + 4, billY);

  billY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(invoice.customerName || "Customer", margin + 4, billY);

  billY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  if (invoice.customerAddress) {
    const addressLines = doc.splitTextToSize(invoice.customerAddress, colWidth - 8);
    doc.text(addressLines[0] || "", margin + 4, billY);
    billY += 3.5;
  }
  const contactInfo = [invoice.customerEmail, invoice.customerPhone].filter(Boolean).join("  •  ");
  if (contactInfo) {
    doc.text(contactInfo, margin + 4, billY);
    billY += 3.5;
  }
  if (invoice.customerGstin) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(`Customer GSTIN: ${invoice.customerGstin}`, margin + 4, billY);
  }

  // Right Card: Billed From (Seller)
  const fromX = margin + colWidth + 6;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(fromX, cursorY, colWidth, cardHeight, 2, 2, "FD");

  let fromY = cursorY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("BILLED FROM (SERVICE PROVIDER):", fromX + 4, fromY);

  fromY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("NavaNala Technologies Pvt. Ltd.", fromX + 4, fromY);

  fromY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Tech Park, Phase II, Hitec City, Hyderabad 500081", fromX + 4, fromY);
  fromY += 3.5;
  doc.text("billing@navanala.com  •  www.navanala.com", fromX + 4, fromY);
  fromY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`GSTIN: ${invoice.companyGstin || "36AAAAA0000A1Z5"}`, fromX + 4, fromY);

  cursorY += cardHeight + 6;

  // 4. Products / Services Itemized Table using jspdf-autotable
  const tableData = (invoice.items || []).map((item, index) => [
    (index + 1).toString(),
    item.description ? `${item.productName}\n${item.description}` : item.productName,
    item.quantity.toString(),
    formatMoney(Number(item.unitPrice)),
    `${item.taxRate}%`,
    formatMoney(Number(item.taxAmount)),
    formatMoney(Number(item.totalAmount)),
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [["#", "Item Description", "Qty", "Unit Price", "GST Rate", "Tax Amount", "Total Amount"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 27, 75], // #1e1b4b
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 3,
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "center", cellWidth: 18 },
      5: { halign: "right", cellWidth: 26 },
      6: { halign: "right", cellWidth: 28, fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  });

  // Calculate final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || (cursorY + 40);
  cursorY = finalY + 6;

  // If table went too close to bottom, add a page
  if (cursorY > pageHeight - 65) {
    doc.addPage();
    cursorY = margin + 5;
  }

  // 5. Financial Summary & Amount in Words Block
  const summaryWidth = 75;
  const summaryX = pageWidth - margin - summaryWidth;
  const wordsWidth = contentWidth - summaryWidth - 6;

  // Left: Total in Words & Bank Details
  doc.setFillColor(240, 244, 255); // indigo-50
  doc.setDrawColor(199, 210, 254); // indigo-200
  doc.roundedRect(margin, cursorY, wordsWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("TOTAL AMOUNT IN WORDS:", margin + 4, cursorY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const wordsLines = doc.splitTextToSize(invoice.totalAmountInWords || "Rupees Zero Only", wordsWidth - 8);
  doc.text(wordsLines, margin + 4, cursorY + 9.5);

  // Bank Info Box below words
  const bankY = cursorY + 22;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, bankY, wordsWidth, 17, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("PAYMENT / BANK REMITTANCE DETAILS:", margin + 4, bankY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Bank: HDFC Bank Ltd  |  A/C: 50200012345678  |  IFSC: HDFC0001234", margin + 4, bankY + 9);
  doc.text(`Payment Mode: ${invoice.paymentMethod || "Bank Transfer"}  |  UPI: navanala@hdfcbank`, margin + 4, bankY + 13.5);

  // Right: Calculation Summary Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(summaryX, cursorY, summaryWidth, 39, 2, 2, "FD");

  let sumY = cursorY + 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Taxable Subtotal:", summaryX + 4, sumY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatMoney(invoice.subtotal), summaryX + summaryWidth - 4, sumY, { align: "right" });

  sumY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Total GST Amount:", summaryX + 4, sumY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text(`+ ${formatMoney(invoice.taxAmount)}`, summaryX + summaryWidth - 4, sumY, { align: "right" });

  if (Number(invoice.discountAmount) > 0) {
    sumY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(190, 18, 60);
    doc.text("Discount Applied:", summaryX + 4, sumY);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${formatMoney(Number(invoice.discountAmount))}`, summaryX + summaryWidth - 4, sumY, { align: "right" });
  }

  // Grand Total Banner
  sumY += 7;
  doc.setFillColor(238, 242, 255); // #eef2ff
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(summaryX + 2, sumY - 4, summaryWidth - 4, 11, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text("Grand Total:", summaryX + 5, sumY + 2.5);

  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(formatMoney(invoice.totalAmount), summaryX + summaryWidth - 5, sumY + 2.5, { align: "right" });

  cursorY = Math.max(bankY + 17, cursorY + 39) + 8;

  // 6. Terms & Signature Section
  if (cursorY > pageHeight - 35) {
    doc.addPage();
    cursorY = margin + 5;
  }

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // Left: Terms
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("Terms & Conditions:", margin, cursorY);

  cursorY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const termsText = invoice.termsAndConditions || "1. Payment due within 15 days.\n2. Standard 18% GST applicable.\n3. Pay via Bank Transfer or UPI.";
  const termsLines = doc.splitTextToSize(termsText, 110);
  doc.text(termsLines, margin, cursorY);

  // Right: Authorized Signatory
  const sigX = pageWidth - margin - 45;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("For NavaNala Technologies", sigX + 22.5, cursorY + 6, { align: "center" });

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(sigX, cursorY + 12, sigX + 45, cursorY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Authorized Signatory", sigX + 22.5, cursorY + 15, { align: "center" });

  // Save the PDF file
  const filename = `Tax-Invoice-${invoice.invoiceNumber || "INV"}.pdf`;
  doc.save(filename);
};
