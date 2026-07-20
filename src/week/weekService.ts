import { invoke } from "@tauri-apps/api/core";
import type {
  CreateWeekInput,
  ReorderWeeksInput,
  UpdateWeekStatusInput,
  UpdateWeekTitleInput,
  Week,
} from "./types";

type WeekErrorPayload = {
  code?: string;
  message?: string;
};

export class WeekServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "WeekServiceError";
    this.code = code;
  }
}

export async function listWeeks(courseId: string): Promise<Week[]> {
  return invoke<Week[]>("list_weeks", { courseId }).catch((error) => {
    throw toWeekServiceError(error, "Week 加载失败");
  });
}

export async function getWeek(id: string): Promise<Week> {
  return invoke<Week>("get_week", { id }).catch((error) => {
    throw toWeekServiceError(error, "Week 加载失败");
  });
}

export async function createWeek(input: CreateWeekInput): Promise<Week> {
  return invoke<Week>("create_week", {
    input: {
      courseId: input.courseId,
      title: input.title,
    },
  }).catch((error) => {
    throw toWeekServiceError(error, "创建失败");
  });
}

export async function updateWeekTitle(
  input: UpdateWeekTitleInput,
): Promise<Week> {
  return invoke<Week>("update_week", {
    input: {
      id: input.id,
      title: input.title,
    },
  }).catch((error) => {
    throw toWeekServiceError(error, "修改失败");
  });
}

export async function updateWeekStatus(
  input: UpdateWeekStatusInput,
): Promise<Week> {
  return invoke<Week>("update_week_status", {
    input: {
      id: input.id,
      status: input.status,
    },
  }).catch((error) => {
    throw toWeekServiceError(error, "状态修改失败");
  });
}

export async function reorderWeeks(input: ReorderWeeksInput): Promise<Week[]> {
  return invoke<Week[]>("reorder_weeks", {
    input: {
      courseId: input.courseId,
      weekIds: input.weekIds,
    },
  }).catch((error) => {
    throw toWeekServiceError(error, "排序失败");
  });
}

export async function deleteWeek(id: string): Promise<void> {
  return invoke<void>("delete_week", { id }).catch((error) => {
    throw toWeekServiceError(error, "删除失败");
  });
}

export function getWeekErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof WeekServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return fallback;
}

function toWeekServiceError(error: unknown, fallback: string): WeekServiceError {
  if (isWeekErrorPayload(error)) {
    return new WeekServiceError(translateWeekError(error, fallback), error.code);
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return new WeekServiceError(fallback);
}

function isWeekErrorPayload(error: unknown): error is WeekErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error)
  );
}

function translateWeekError(error: WeekErrorPayload, fallback: string): string {
  switch (error.code) {
    case "validation_error":
      return error.message || "Week 信息不符合要求";
    case "course_not_found":
      return "课程不存在或已被删除。";
    case "week_not_found":
      return "Week 不存在，可能已被删除";
    case "invalid_week_status":
      return "Week 状态无效";
    case "invalid_reorder_request":
      return error.message || "Week 排序请求无效";
    case "constraint_error":
      return "Week 数据冲突，请检查后重试";
    case "database_locked":
      return "数据库正忙，请稍后重试";
    case "database_error":
      return "数据库操作失败，请稍后重试";
    default:
      return fallback;
  }
}
