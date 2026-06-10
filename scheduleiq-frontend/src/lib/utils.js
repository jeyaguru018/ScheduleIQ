import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple class names/arrays/objects into a single Tailwind-optimized string.
 * This automatically resolves Tailwind class conflicts (e.g., `px-2 px-4` -> `px-4`).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
