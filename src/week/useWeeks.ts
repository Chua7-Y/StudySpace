import { useCallback, useEffect, useState } from "react";
import {
  createWeek as createWeekRequest,
  deleteWeek as deleteWeekRequest,
  getWeekErrorMessage,
  listWeeks as listWeeksRequest,
  reorderWeeks as reorderWeeksRequest,
  updateWeekStatus as updateWeekStatusRequest,
  updateWeekTitle as updateWeekTitleRequest,
} from "./weekService";
import type { Week, WeekStatus } from "./types";

export function useWeeks(courseId: string) {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingWeekId, setUpdatingWeekId] = useState<string | null>(null);
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const loadWeeks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const loadedWeeks = await listWeeksRequest(courseId);
      setWeeks(loadedWeeks);
    } catch (error) {
      setLoadError(getWeekErrorMessage(error, "Week 加载失败"));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadWeeks();
  }, [loadWeeks]);

  const createWeek = useCallback(
    async (title: string) => {
      setActionError(null);
      setIsCreating(true);

      try {
        const createdWeek = await createWeekRequest({ courseId, title });
        const loadedWeeks = await listWeeksRequest(courseId);
        setWeeks(Array.isArray(loadedWeeks) ? loadedWeeks : [...weeks, createdWeek]);
        return createdWeek;
      } catch (error) {
        setActionError(getWeekErrorMessage(error, "创建失败"));
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [courseId, weeks],
  );

  const updateWeekTitle = useCallback(async (id: string, title: string) => {
    setActionError(null);
    setUpdatingWeekId(id);

    try {
      const updatedWeek = await updateWeekTitleRequest({ id, title });
      setWeeks((currentWeeks) =>
        currentWeeks.map((week) => (week.id === id ? updatedWeek : week)),
      );
      return updatedWeek;
    } catch (error) {
      setActionError(getWeekErrorMessage(error, "修改失败"));
      throw error;
    } finally {
      setUpdatingWeekId(null);
    }
  }, []);

  const updateWeekStatus = useCallback(
    async (id: string, status: WeekStatus) => {
      setActionError(null);
      setUpdatingWeekId(id);
      const previousWeeks = weeks;

      try {
        const updatedWeek = await updateWeekStatusRequest({ id, status });
        setWeeks((currentWeeks) =>
          currentWeeks.map((week) => (week.id === id ? updatedWeek : week)),
        );
        return updatedWeek;
      } catch (error) {
        setWeeks(previousWeeks);
        setActionError(getWeekErrorMessage(error, "状态修改失败"));
        throw error;
      } finally {
        setUpdatingWeekId(null);
      }
    },
    [weeks],
  );

  const deleteWeek = useCallback(async (id: string) => {
    setActionError(null);
    setDeletingWeekId(id);

    try {
      await deleteWeekRequest(id);
      setWeeks((currentWeeks) => currentWeeks.filter((week) => week.id !== id));
    } catch (error) {
      setActionError(getWeekErrorMessage(error, "删除失败"));
      throw error;
    } finally {
      setDeletingWeekId(null);
    }
  }, []);

  const reorderWeekIds = useCallback(
    async (weekIds: string[]) => {
      const existingIds = new Set(weeks.map((week) => week.id));
      const requestedIds = new Set(weekIds);

      if (
        isReordering ||
        weekIds.length !== weeks.length ||
        requestedIds.size !== weekIds.length ||
        weekIds.some((id) => !existingIds.has(id))
      ) {
        return;
      }

      setActionError(null);
      setIsReordering(true);
      const previousWeeks = weeks;
      const weekById = new Map(weeks.map((week) => [week.id, week]));
      const reorderedWeeks = weekIds
        .map((id) => weekById.get(id))
        .filter((week): week is Week => Boolean(week));
      setWeeks(reorderedWeeks);

      try {
        const updatedWeeks = await reorderWeeksRequest({
          courseId,
          weekIds,
        });
        setWeeks(updatedWeeks);
        return updatedWeeks;
      } catch (error) {
        setWeeks(previousWeeks);
        setActionError(getWeekErrorMessage(error, "排序失败"));
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [courseId, isReordering, weeks],
  );

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    weeks,
    isLoading,
    loadError,
    actionError,
    isCreating,
    updatingWeekId,
    deletingWeekId,
    isReordering,
    loadWeeks,
    createWeek,
    updateWeekTitle,
    updateWeekStatus,
    deleteWeek,
    reorderWeekIds,
    clearActionError,
  };
}
