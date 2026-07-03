const STORAGE_KEY = "sr_loan_categories";
const DEFAULT_CATEGORIES = [
  "Business Loan",
  "Salaried Loan",
  "Personal Loan",
  "Home Loan",
  "Vehicle Loan",
];

export function getLoanCategories(): string[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Initialize with defaults if not set
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export function addLoanCategory(name: string): string[] {
  const cats = getLoanCategories();
  const trimmed = name.trim();
  if (!trimmed || cats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return cats;
  const updated = [...cats, trimmed];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeLoanCategory(name: string): string[] {
  const cats = getLoanCategories();
  const updated = cats.filter((c) => c !== name);
  if (updated.length === 0) return cats; // Don't allow empty list
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function resetLoanCategories(): string[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}
