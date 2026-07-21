import { useCallback, useEffect, useMemo, useState } from "react";
import {
  chooseSourceResourcePaths,
  getResourceErrorMessage,
  importSourceResources,
  listSourceResources,
} from "./resourceService";
import type { SourceResource } from "./types";

export function useResources(weekId: string) {
  const [resources, setResources] = useState<SourceResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const selectedResource = useMemo(
    () =>
      resources.find((resource) => resource.id === selectedResourceId) ?? null,
    [resources, selectedResourceId],
  );

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const loadedResources = await listSourceResources(weekId);
      setResources(loadedResources);
      setSelectedResourceId((currentId) => {
        if (currentId && loadedResources.some((resource) => resource.id === currentId)) {
          return currentId;
        }

        return loadedResources[0]?.id ?? null;
      });
    } catch (error) {
      setLoadError(getResourceErrorMessage(error, "资料加载失败"));
    } finally {
      setIsLoading(false);
    }
  }, [weekId]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const chooseAndImportResources = useCallback(async () => {
    setImportError(null);
    const paths = await chooseSourceResourcePaths();

    if (!paths || paths.length === 0) {
      return;
    }

    setIsImporting(true);
    const hadSelectedResource = selectedResourceId !== null;

    try {
      const importedResources = await importSourceResources({ weekId, paths });
      setResources(importedResources);
      setSelectedResourceId((currentId) => {
        if (hadSelectedResource && currentId) {
          return currentId;
        }

        return importedResources[0]?.id ?? null;
      });
    } catch (error) {
      setImportError(getResourceErrorMessage(error, "导入失败"));
    } finally {
      setIsImporting(false);
    }
  }, [selectedResourceId, weekId]);

  return {
    resources,
    selectedResource,
    selectedResourceId,
    isLoading,
    isImporting,
    loadError,
    importError,
    loadResources,
    chooseAndImportResources,
    setSelectedResourceId,
  };
}
