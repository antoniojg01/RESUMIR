export enum VideoDetailLevel {
  Fast = 'fast',
  Balanced = 'balanced',
  Detailed = 'detailed'
}

export enum PdfMode {
  UltraFast = 'ultra-fast',
  Essential = 'essential',
  Detailed = 'detailed'
}

export interface ProcessingResult {
  text: string;
  audioUrl?: string;
  stats?: {
    inputCount: number;
    outputWordCount: number;
    readTimeMinutes: number;
    reductionPercent?: number;
  };
}

export interface FrameData {
  timestamp: number;
  data: string; // Base64
}
