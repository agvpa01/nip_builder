import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert thickness value to CSS border style
export function getThicknessBorderStyle(thickness: string): string {
  switch (thickness) {
    case "normal":
      return "1px solid black";
    case "thick":
      return "2px solid black";
    case "medium-thick":
      return "3px solid black";
    case "large-thick":
      return "4px solid black";
    case "extra-large-thick":
      return "5px solid black";
    default:
      return "1px solid black";
  }
}
