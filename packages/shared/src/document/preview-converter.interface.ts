export interface PreviewResult {
  pages: number;
  format: string;
  storageKey: string;
}

export interface DocumentPreviewConverter {
  convert(file: Buffer, mimeType: string): Promise<PreviewResult>;
}
