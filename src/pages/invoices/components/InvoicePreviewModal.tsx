import React, { useState } from "react";
import {
  Close,
  PictureAsPdfOutlined,
  PrintOutlined,
  CheckCircleOutline,
  ScheduleOutlined,
  WarningAmberOutlined,
  AccountBalanceOutlined,
  QrCode2Outlined,
  BusinessOutlined,
  PersonOutline,
  DownloadDoneOutlined,
} from "@mui/icons-material";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import type { InvoiceDto } from "../../../types/invoice";
import { downloadInvoicePdf } from "../../../utils/invoicePdfGenerator";

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceDto | null;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !invoice) return null;

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return {
          label: "PAID",
          badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-500/30",
          stampClass: "border-emerald-600 text-emerald-600 bg-emerald-50/50",
          icon: <CheckCircleOutline sx={{ fontSize: 16 }} />,
        };
      case "pending":
        return {
          label: "PENDING PAYMENT",
          badgeClass: "bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-500/30",
          stampClass: "border-amber-600 text-amber-600 bg-amber-50/50",
          icon: <ScheduleOutlined sx={{ fontSize: 16 }} />,
        };
      case "overdue":
        return {
          label: "OVERDUE",
          badgeClass: "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-500/30",
          stampClass: "border-rose-600 text-rose-600 bg-rose-50/50",
          icon: <WarningAmberOutlined sx={{ fontSize: 16 }} />,
        };
      default:
        return {
          label: status?.toUpperCase() || "DRAFT",
          badgeClass: "bg-slate-500/10 text-slate-700 border-slate-300 dark:border-slate-500/30",
          stampClass: "border-slate-500 text-slate-600 bg-slate-50/50",
          icon: <ScheduleOutlined sx={{ fontSize: 16 }} />,
        };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);

  // Dedicated PDF Download handler with instant vector PDF generation
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setDownloadSuccess(false);

      // Generate and download high-resolution vector PDF
      downloadInvoicePdf(invoice);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dedicated Print handler
  const handlePrint = () => {
    window.print();
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format Currency helper
  const formatINR = (amount?: number) => {
    return (amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/75 p-3 sm:p-5 backdrop-blur-xs">
      {/* Modal Container */}
      <div
        id="printable-invoice-wrapper"
        className="relative w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 text-slate-900 dark:text-white shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Invoice #{invoice.invoiceNumber}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeClass}`}
                >
                  {statusConfig.icon}
                  <span>{invoice.status}</span>
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Created: {formatDate(invoice.invoiceDate)} • Customer: {invoice.customerName}
              </span>
            </div>
          </div>

          {/* Action Buttons: Separate Download & Print */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
            >
              {isGeneratingPdf ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <DownloadDoneOutlined sx={{ fontSize: 17 }} />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <PictureAsPdfOutlined sx={{ fontSize: 17 }} />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-98 transition-all cursor-pointer"
            >
              <PrintOutlined sx={{ fontSize: 17 }} />
              <span>Print Bill</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Close Preview"
            >
              <Close sx={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto pr-1 flex-1 flex justify-center">
          {/* Printable Invoice Card */}
          <div
            id="printable-invoice"
            className="w-full bg-white text-slate-900 rounded-2xl border border-slate-200/90 p-6 sm:p-9 shadow-sm"
            style={{
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Top Accent Gradient Bar */}
            <div className="h-2 w-full rounded-t-lg bg-linear-to-r from-indigo-600 via-blue-600 to-indigo-800 mb-6" />

            {/* Header: Company Identity & Tax Invoice Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-200 pb-6">
              {/* Company Logo & Details */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-auto max-w-[200px] flex items-center justify-center">
                  <img
                    src="/navanala-logo.png"
                    alt="NavaNala Technologies"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="border-l-2 border-slate-200 pl-4">
                  <p className="text-xs font-semibold text-slate-600 tracking-tight">
                    Enterprise Cloud & IT Solutions
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    GSTIN: <span className="font-bold text-slate-800">{invoice.companyGstin || "36AAAAA0000A1Z5"}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    State Code: <span className="font-semibold text-slate-700">36 (Telangana)</span>
                  </p>
                </div>
              </div>

              {/* Tax Invoice Meta Block */}
              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3.5 sm:p-0 rounded-xl sm:rounded-none w-full sm:w-auto">
                <div className="inline-block px-3 py-1 bg-indigo-900 text-white rounded-md text-[11px] font-extrabold tracking-widest uppercase mb-1.5">
                  Tax Invoice
                </div>
                <h2 className="text-xl font-mono font-black text-indigo-950">
                  #{invoice.invoiceNumber}
                </h2>
                <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                  <p>
                    <span className="text-slate-400 font-medium">Invoice Date: </span>
                    <strong className="text-slate-800 font-mono">{formatDate(invoice.invoiceDate)}</strong>
                  </p>
                  {invoice.dueDate && (
                    <p>
                      <span className="text-slate-400 font-medium">Due Date: </span>
                      <strong className="text-slate-800 font-mono">{formatDate(invoice.dueDate)}</strong>
                    </p>
                  )}
                  <div className="mt-2 inline-flex items-center gap-1.5 border border-slate-300 rounded-md px-2 py-0.5 text-[11px] font-bold">
                    <span>Status:</span>
                    <span className={statusConfig.badgeClass.split(" ")[1]}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To & Origin Addresses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200">
              {/* Billed To Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-800 font-bold uppercase tracking-wider text-[11px]">
                  <PersonOutline sx={{ fontSize: 15 }} />
                  <span>Billed To (Customer / Client)</span>
                </div>
                <p className="text-sm font-black text-slate-900">{invoice.customerName}</p>
                {invoice.customerAddress && (
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {invoice.customerAddress}
                  </p>
                )}
                <div className="pt-1 text-xs text-slate-600 space-y-0.5">
                  {invoice.customerEmail && (
                    <p>
                      <span className="text-slate-400 font-medium">Email: </span>
                      <span className="text-slate-800">{invoice.customerEmail}</span>
                    </p>
                  )}
                  {invoice.customerPhone && (
                    <p>
                      <span className="text-slate-400 font-medium">Phone: </span>
                      <span className="text-slate-800">{invoice.customerPhone}</span>
                    </p>
                  )}
                  {invoice.customerGstin && (
                    <p className="pt-0.5">
                      <span className="text-slate-400 font-medium">GSTIN: </span>
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[11px]">
                        {invoice.customerGstin}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Billed From Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-800 font-bold uppercase tracking-wider text-[11px]">
                  <BusinessOutlined sx={{ fontSize: 15 }} />
                  <span>Billed From (Service Provider)</span>
                </div>
                <p className="text-sm font-black text-slate-900">NavaNala Technologies Pvt. Ltd.</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tech Park, Phase II, Hitec City,
                  <br />
                  Hyderabad, Telangana 500081, India
                </p>
                <div className="pt-1 text-xs text-slate-600 space-y-0.5">
                  <p>
                    <span className="text-slate-400 font-medium">Email: </span>
                    <span className="text-slate-800">billing@navanala.com</span>
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Website: </span>
                    <span className="text-slate-800">www.navanala.com</span>
                  </p>
                  <p className="pt-0.5">
                    <span className="text-slate-400 font-medium">GSTIN: </span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">
                      {invoice.companyGstin || "36AAAAA0000A1Z5"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-5 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-950 text-white font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l-lg text-center w-10">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-3 text-right w-20">GST %</th>
                    <th className="py-2.5 px-3 text-right w-24">Tax (₹)</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-[13px]">{item.productName}</div>
                          {item.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          ₹{formatINR(Number(item.unitPrice))}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-indigo-700">
                          {item.taxRate}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          ₹{formatINR(Number(item.taxAmount))}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{formatINR(Number(item.totalAmount))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        No items found in this invoice
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Payment Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t-2 border-slate-200">
              {/* Left: Amount in Words & Bank Details */}
              <div className="space-y-3.5">
                {/* Total in Words */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-0.5">
                    Amount Chargeable (in words):
                  </span>
                  <p className="text-xs font-extrabold text-indigo-950 leading-relaxed">
                    {invoice.totalAmountInWords || "Rupees Zero Only"}
                  </p>
                </div>

                {/* Bank & Remittance Info */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-[11px] text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                    <AccountBalanceOutlined sx={{ fontSize: 14 }} className="text-indigo-700" />
                    <span>Payment Remittance Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div>
                      <span className="text-slate-400">Bank Name: </span>
                      <strong className="text-slate-800">HDFC Bank Ltd</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">A/C No: </span>
                      <strong className="font-mono text-slate-800">50200012345678</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">IFSC Code: </span>
                      <strong className="font-mono text-slate-800">HDFC0001234</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Branch: </span>
                      <span className="text-slate-800">Hitec City, Hyd</span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500">
                      Payment Mode: <strong className="text-slate-800">{invoice.paymentMethod || "Bank Transfer / NEFT"}</strong>
                    </span>
                    <span className="font-mono font-bold text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded text-[10px]">
                      UPI: navanala@hdfcbank
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Calculations & Grand Total */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Taxable Amount (Subtotal):</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ₹{formatINR(invoice.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-indigo-800">
                  <span className="font-medium">GST Collected (Tax Amount):</span>
                  <span className="font-mono font-semibold">
                    + ₹{formatINR(invoice.taxAmount)}
                  </span>
                </div>

                {Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between items-center text-rose-700">
                    <span className="font-medium">Discount Applied:</span>
                    <span className="font-mono font-semibold">
                      - ₹{formatINR(Number(invoice.discountAmount))}
                    </span>
                  </div>
                )}

                <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-extrabold text-slate-900 block">Total Due (INR):</span>
                    <span className="text-[10px] text-slate-500 font-medium">Inclusive of all taxes</span>
                  </div>
                  <span className="font-mono text-lg font-black text-indigo-900 bg-indigo-100/60 px-3 py-1 rounded-lg border border-indigo-200">
                    ₹{formatINR(invoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Authorized Signature Footer */}
            <div className="mt-8 border-t border-slate-200 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px] text-slate-600 items-end">
              <div>
                <span className="font-bold text-slate-800 block mb-1">Terms & Conditions:</span>
                <p className="whitespace-pre-line leading-relaxed text-slate-500">
                  {invoice.termsAndConditions ||
                    "1. Payment due within 15 days of invoice date.\n2. Standard 18% GST rate applicable as per Indian Tax rules.\n3. Make payments via NEFT/RTGS or UPI."}
                </p>
                {invoice.notes && (
                  <p className="mt-2 text-indigo-900 font-medium italic">
                    Note: {invoice.notes}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right pt-4 sm:pt-0">
                <div className="inline-block text-center min-w-[200px]">
                  <div className="h-10 flex items-center justify-center">
                    <span className="font-serif italic text-slate-400 text-sm font-bold opacity-60">
                      NavaNala Auth Sign
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1.5">
                    <p className="font-bold text-slate-900 text-xs">For NavaNala Technologies Pvt. Ltd.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle Print Footer Note */}
            <div className="mt-6 border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
              This is a computer-generated commercial tax invoice and does not require physical stamp.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
