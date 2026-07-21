import { useCallback, useEffect, useState } from "react";
import {
  getDocumentErrorMessage,
  getLearningDocument,
  saveLearningDocument,
} from "./documentService";
import type { LearningDocument } from "./types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function useLearningDocument(weekId: string) {
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const loadDocument = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveState("idle");

    try {
      const loadedDocument = await getLearningDocument(weekId);
      setDocument(loadedDocument);
      setContent(loadedDocument.content);
    } catch (error) {
      setLoadError(getDocumentErrorMessage(error, "学习文档加载失败"));
    } finally {
      setIsLoading(false);
    }
  }, [weekId]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  const save = useCallback(async () => {
    setSaveState("saving");
    setSaveError(null);

    try {
      const savedDocument = await saveLearningDocument({
        weekId,
        content,
      });
      setDocument(savedDocument);
      setContent(savedDocument.content);
      setSaveState("saved");
    } catch (error) {
      setSaveError(getDocumentErrorMessage(error, "保存失败"));
      setSaveState("error");
    }
  }, [content, weekId]);

  const updateContent = (nextContent: string) => {
    setContent(nextContent);
    if (saveState === "saved") {
      setSaveState("idle");
    }
    setSaveError(null);
  };

  return {
    document,
    content,
    isDirty: document !== null && content !== document.content,
    isLoading,
    isSaving: saveState === "saving",
    saveState,
    loadError,
    saveError,
    loadDocument,
    updateContent,
    save,
  };
}
