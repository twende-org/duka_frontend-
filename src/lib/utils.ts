import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { runtimeEnv } from "@/lib/api/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function toSafeDate(date: any): Date | null {
  if (!date) return null;

  try {
    // Handle legacy timestamp objects ({ toDate })
    if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate();
    }

    // Handle string or number
    if (typeof date === 'string' || typeof date === 'number') {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      return dateObj;
    }

    // Handle Date object
    if (date instanceof Date) {
      return date;
    }

    return null;
  } catch (error) {
    console.error("Error converting to safe date:", error);
    return null;
  }
}

export function getBaseUrl() {
  const appUrl = runtimeEnv("VITE_APP_URL");
  if (appUrl) {
    return appUrl;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://duka.twendedigital.tech";
}
