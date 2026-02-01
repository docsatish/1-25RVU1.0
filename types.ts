export interface RVUEntry {
  cpt?: string;
  description: string;
  rvu: number;
}

export interface MoonlightingTier {
  minDays: number;
  multiplier: number;
}

export interface WorklistItem {
  cpt?: string;
  description?: string;
  count: number;
  rvuPerStudy?: number;
  totalRVU?: number;
  examDate?: string; // Date the exam was performed
}

export interface WorklistLog {
  id: string;
  date: string; // The date these were read
  timestamp: number;
  items: WorklistItem[];
  totalRVUs: number;
  totalEarnings: number;
  conversionFactor: number;
  physicianName?: string;
  radiologyGroup?: string;
  location?: string;
  imageUrl?: string | null;
  isMoonlighting?: boolean;
  moonlightingTiers?: MoonlightingTier[];
}

export interface AnalysisResult {
  items: WorklistItem[];
  totalRVUs: number;
  totalEarnings: number;
  timestamp: number;
}