export type SourceResource = {
  id: string;
  weekId: string;
  originalFileName: string;
  fileType: string;
  mimeType: string | null;
  localStoragePath: string;
  fileSizeBytes: number;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SourceResourceBytes = {
  bytes: number[];
  mimeType: string;
};

export type ResourceKind =
  | "pdf"
  | "image"
  | "text"
  | "presentation"
  | "document"
  | "unknown";
