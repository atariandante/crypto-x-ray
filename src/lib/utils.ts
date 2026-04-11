import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional class names while preserving Tailwind conflict resolution.
 * This keeps component call sites readable instead of duplicating merge logic.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
