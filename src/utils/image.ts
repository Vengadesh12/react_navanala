import { API_URL } from "../config/constants";

/**
 * Validates whether a given file is a valid image format and within allowed size constraints.
 * 
 * @param file The File instance selected by the user
 * @param maxSizeBytes Maximum permitted file size in bytes (default: 5MB)
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number = 5 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "Please select an image file to upload." };
  }

  // Allowed MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
  ];

  // Allowed extensions
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = file.type.startsWith("image/") || allowedMimeTypes.includes(file.type.toLowerCase());

  if (!hasValidMime && !hasValidExtension) {
    return {
      valid: false,
      error: "Invalid file type. Please select an image file (.jpg, .jpeg, .png, .webp, .gif, .avif).",
    };
  }

  if (file.size > maxSizeBytes) {
    const sizeInMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Image file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${sizeInMb} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Computes the complete accessible URL for a user profile avatar image.
 * If the path is relative (/uploads/profiles/...), it is prefixed with the backend API URL.
 * If no image is provided, a handsome fallback SVG avatar is generated using UI Avatars.
 * 
 * @param profileImage The stored profile image path or URL
 * @param fallbackName The user name used to generate initial letters in fallback avatar
 */
export function getProfileImageUrl(profileImage?: string | null, fallbackName: string = "User"): string {
  if (!profileImage || typeof profileImage !== "string" || profileImage.trim() === "") {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fallbackName.trim() || "User"
    )}&background=2563eb&color=fff&size=128&bold=true`;
  }

  const trimmed = profileImage.trim();

  // Full external URL (e.g. https://... or http://...)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // Relative backend path (e.g. /uploads/profiles/...)
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

  return `${baseUrl}${normalizedPath}`;
}
