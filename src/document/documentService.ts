import { invoke } from "@tauri-apps/api/core";
import type { LearningDocument, SaveLearningDocumentInput } from "./types";

type DocumentErrorPayload = {
  code?: string;
  message?: string;
};

export class DocumentServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "DocumentServiceError";
    this.code = code;
  }
}

export async function getLearningDocument(
  weekId: string,
): Promise<LearningDocument> {
  return invoke<LearningDocument>("get_learning_document", { weekId }).catch(
    (error) => {
      throw toDocumentServiceError(error, "学习文档加载失败");
    },
  );
}

export async function saveLearningDocument(
  input: SaveLearningDocumentInput,
): Promise<LearningDocument> {
  return invoke<LearningDocument>("save_learning_document", {
    input: {
      weekId: input.weekId,
      content: input.content,
    },
  }).catch((error) => {
    throw toDocumentServiceError(error, "保存失败");
  });
}

export function getDocumentErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof DocumentServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return fallback;
}

function toDocumentServiceError(
  error: unknown,
  fallback: string,
): DocumentServiceError {
  if (isDocumentErrorPayload(error)) {
    return new DocumentServiceError(
      translateDocumentError(error, fallback),
      error.code,
    );
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return new DocumentServiceError(fallback);
}

function isDocumentErrorPayload(error: unknown): error is DocumentErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error)
  );
}

function translateDocumentError(
  error: DocumentErrorPayload,
  fallback: string,
): string {
  switch (error.code) {
    case "validation_error":
      return error.message || "学习文档信息不符合要求";
    case "week_not_found":
      return "Week 不存在或已被删除";
    case "document_not_found":
      return "学习文档不存在";
    case "invalid_document_content":
      return "学习文档内容格式无效";
    case "constraint_error":
      return "学习文档数据冲突，请稍后重试";
    case "database_locked":
      return "数据库正忙，请稍后重试";
    case "database_error":
      return "数据库操作失败，请稍后重试";
    default:
      return fallback;
  }
}
