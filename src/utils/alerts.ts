import Swal, { SweetAlertResult } from "sweetalert2";

const customClassDefault = {
  popup: "rounded-2xl p-6 font-sans shadow-2xl border border-slate-200",
  confirmButton:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 cursor-pointer",
  cancelButton:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer mr-2",
};

export const showSuccessAlert = (title: string, text?: string): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    customClass: customClassDefault,
    buttonsStyling: false,
  });
};

export const showErrorAlert = (title: string, text?: string): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "error",
    title,
    text: text || "An unexpected error occurred. Please try again.",
    customClass: customClassDefault,
    buttonsStyling: false,
  });
};

export const showWarningAlert = (title: string, text?: string): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    customClass: customClassDefault,
    buttonsStyling: false,
  });
};

export const showConfirmDialog = (
  title: string,
  text: string,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  isDestructive = false
): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    customClass: {
      popup: "rounded-2xl p-6 font-sans shadow-2xl border border-slate-200",
      confirmButton: isDestructive
        ? "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 mr-2 cursor-pointer"
        : "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 cursor-pointer mr-2",
      cancelButton:
        "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer",
    },
    buttonsStyling: false,
  });
};
