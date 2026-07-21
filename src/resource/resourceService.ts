import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { SourceResource, SourceResourceBytes } from "./types";

type SourceResourceErrorPayload = {
  code?: string;
  message?: string;
};

export class ResourceServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ResourceServiceError";
    this.code = code;
  }
}

export async function chooseSourceResourcePaths(): Promise<string[] | null> {
  const selected = await open({
    multiple: true,
    directory: false,
    filters: [
      {
        name: "学习资料",
        extensions: [
          "pdf",
          "ppt",
          "pptx",
          "doc",
          "docx",
          "txt",
          "md",
          "png",
          "jpg",
          "jpeg",
        ],
      },
    ],
  });

  if (selected === null) {
    return null;
  }

  return Array.isArray(selected) ? selected : [selected];
}

export async function listSourceResources(
  weekId: string,
): Promise<SourceResource[]> {
  return invoke<SourceResource[]>("list_source_resources", {
    weekId,
  }).catch((error) => {
    throw toResourceServiceError(error, "资料加载失败");
  });
}

export async function importSourceResources(input: {
  weekId: string;
  paths: string[];
}): Promise<SourceResource[]> {
  return invoke<SourceResource[]>("import_source_resources", {
    input: {
      weekId: input.weekId,
      paths: input.paths,
    },
  }).catch((error) => {
    throw toResourceServiceError(error, "导入失败");
  });
}

export async function readSourceResourceText(id: string): Promise<string> {
  return invoke<string>("read_source_resource_text", { id }).catch((error) => {
    throw toResourceServiceError(error, "无法读取该文件，文件可能已被移动或删除。");
  });
}

export async function readSourceResourceBytes(
  id: string,
): Promise<SourceResourceBytes> {
  return invoke<SourceResourceBytes>("read_source_resource_bytes", { id }).catch(
    (error) => {
      throw toResourceServiceError(
        error,
        "无法读取该文件，文件可能已被移动或删除。",
      );
    },
  );
}

export function getResourceErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ResourceServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return fallback;
}

function toResourceServiceError(
  error: unknown,
  fallback: string,
): ResourceServiceError {
  if (isSourceResourceErrorPayload(error)) {
    return new ResourceServiceError(
      translateResourceError(error, fallback),
      error.code,
    );
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return new ResourceServiceError(fallback);
}

function isSourceResourceErrorPayload(
  error: unknown,
): error is SourceResourceErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error)
  );
}

function translateResourceError(
  error: SourceResourceErrorPayload,
  fallback: string,
): string {
  switch (error.code) {
    case "validation_error":
      return error.message || "资料信息不符合要求";
    case "week_not_found":
      return "Week 不存在或已被删除";
    case "source_resource_not_found":
      return "资料不存在，可能已被删除";
    case "unsupported_file_type":
      return "当前文件类型不支持导入";
    case "file_read_error":
      return "无法读取该文件，文件可能已被移动或删除。";
    case "constraint_error":
      return "资料数据冲突，请稍后重试";
    case "database_locked":
      return "数据库正忙，请稍后重试";
    case "database_error":
      return "数据库操作失败，请稍后重试";
    default:
      return fallback;
  }
}
