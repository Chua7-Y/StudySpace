import { useCallback, useEffect, useState } from "react";
import {
  createCourse as createCourseRequest,
  deleteCourse as deleteCourseRequest,
  getCourseErrorMessage,
  listCourses as listCoursesRequest,
  updateCourse as updateCourseRequest,
} from "./courseService";
import type { Course } from "./types";

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingCourseId, setUpdatingCourseId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedCourses = await listCoursesRequest();
      setCourses(loadedCourses);
    } catch (loadError) {
      setError(getCourseErrorMessage(loadError, "课程列表加载失败"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const refreshCoursesAfterMutation = useCallback(async () => {
    try {
      const loadedCourses = await listCoursesRequest();
      if (Array.isArray(loadedCourses)) {
        setCourses(loadedCourses);
      }
    } catch (refreshError) {
      console.error(refreshError);
    }
  }, []);

  const createCourse = useCallback(async (name: string) => {
    setActionError(null);
    setIsCreating(true);

    try {
      const createdCourse = await createCourseRequest({ name });
      setCourses((currentCourses) => [...currentCourses, createdCourse]);
      await refreshCoursesAfterMutation();
      return createdCourse;
    } catch (createError) {
      setActionError(getCourseErrorMessage(createError, "创建失败"));
      throw createError;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateCourse = useCallback(async (id: string, name: string) => {
    setActionError(null);
    setUpdatingCourseId(id);

    try {
      const updatedCourse = await updateCourseRequest({ id, name });
      setCourses((currentCourses) =>
        currentCourses.map((course) =>
          course.id === updatedCourse.id ? updatedCourse : course,
        ),
      );
      await refreshCoursesAfterMutation();
      return updatedCourse;
    } catch (updateError) {
      setActionError(getCourseErrorMessage(updateError, "修改失败"));
      throw updateError;
    } finally {
      setUpdatingCourseId(null);
    }
  }, []);

  const deleteCourse = useCallback(async (id: string) => {
    setActionError(null);
    setDeletingCourseId(id);

    try {
      await deleteCourseRequest(id);
      setCourses((currentCourses) =>
        currentCourses.filter((course) => course.id !== id),
      );
      await refreshCoursesAfterMutation();
    } catch (deleteError) {
      setActionError(getCourseErrorMessage(deleteError, "删除失败"));
      throw deleteError;
    } finally {
      setDeletingCourseId(null);
    }
  }, []);

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    courses,
    isLoading,
    isCreating,
    updatingCourseId,
    deletingCourseId,
    error,
    actionError,
    loadCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    clearActionError,
  };
}
