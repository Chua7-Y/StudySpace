import { invoke } from "@tauri-apps/api/core";
import type { Course, CreateCourseInput, UpdateCourseInput } from "./types";

type CourseErrorPayload = {
  code?: string;
  message?: string;
};

export class CourseServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "CourseServiceError";
    this.code = code;
  }
}

export async function listCourses(): Promise<Course[]> {
  return invoke<Course[]>("list_courses").catch((error) => {
    throw toCourseServiceError(error, "课程列表加载失败");
  });
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  return invoke<Course>("create_course", {
    input: {
      name: input.name,
    },
  }).catch((error) => {
    throw toCourseServiceError(error, "创建失败");
  });
}

export async function updateCourse(input: UpdateCourseInput): Promise<Course> {
  return invoke<Course>("update_course", {
    input: {
      id: input.id,
      name: input.name,
    },
  }).catch((error) => {
    throw toCourseServiceError(error, "修改失败");
  });
}

export async function deleteCourse(id: string): Promise<void> {
  return invoke<void>("delete_course", { id }).catch((error) => {
    throw toCourseServiceError(error, "删除失败");
  });
}

export function getCourseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof CourseServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return fallback;
}

function toCourseServiceError(error: unknown, fallback: string): CourseServiceError {
  if (isCourseErrorPayload(error)) {
    return new CourseServiceError(translateCourseError(error, fallback), error.code);
  }

  if (error instanceof Error) {
    console.error(error);
  }

  return new CourseServiceError(fallback);
}

function isCourseErrorPayload(error: unknown): error is CourseErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error)
  );
}

function translateCourseError(
  error: CourseErrorPayload,
  fallback: string,
): string {
  switch (error.code) {
    case "validation_error":
      return error.message || "课程信息不符合要求";
    case "course_not_found":
      return "课程不存在，可能已被删除";
    case "constraint_error":
      return "课程数据冲突，请检查后重试";
    case "database_locked":
      return "数据库正忙，请稍后重试";
    case "database_error":
      return "数据库操作失败，请稍后重试";
    default:
      return fallback;
  }
}
