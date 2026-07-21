import type { ResourceKind, SourceResource } from "./types";

const imageTypes = new Set(["png", "jpg", "jpeg"]);
const textTypes = new Set(["txt", "md"]);
const presentationTypes = new Set(["ppt", "pptx"]);
const documentTypes = new Set(["doc", "docx"]);

export function getResourceKind(fileNameOrType: string): ResourceKind {
  const extension = fileNameOrType.includes(".")
    ? fileNameOrType.split(".").pop()?.toLowerCase()
    : fileNameOrType.toLowerCase();

  if (!extension) {
    return "unknown";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (imageTypes.has(extension)) {
    return "image";
  }

  if (textTypes.has(extension)) {
    return "text";
  }

  if (presentationTypes.has(extension)) {
    return "presentation";
  }

  if (documentTypes.has(extension)) {
    return "document";
  }

  return "unknown";
}

export function getResourceTypeLabel(resource: SourceResource): string {
  const kind = getResourceKind(resource.fileType || resource.originalFileName);

  switch (kind) {
    case "pdf":
      return "PDF";
    case "image":
      return "IMG";
    case "text":
      return resource.fileType.toUpperCase();
    case "presentation":
      return resource.fileType.toUpperCase();
    case "document":
      return resource.fileType.toUpperCase();
    default:
      return "FILE";
  }
}
