export interface ScanResult {
  clean: boolean;
  virusName?: string;
  scannedAt: string;
}

export interface VirusScanner {
  scan(file: Buffer, fileName: string): Promise<ScanResult>;
}
