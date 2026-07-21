import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDocumentErrorMessage,
  getLearningDocument,
  saveLearningDocument,
} from "./documentService";
import type { LearningDocument } from "./types";

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTO_SAVE_DELAY_MS = 1000;

export function useLearningDocument(weekId: string) {
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const contentRef = useRef(content);
  const documentRef = useRef<LearningDocument | null>(document);
  const dirtyRef = useRef(false);

  useEffect(() => {
    contentRef.current = content;
    dirtyRef.current = document !== null && content !== document.content;
  }, [content, document]);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const loadDocument = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveState("idle");

    try {
      const loadedDocument = await getLearningDocument(weekId);
      setDocument(loadedDocument);
      setContent(loadedDocument.content);
      contentRef.current = loadedDocument.content;
      documentRef.current = loadedDocument;
      dirtyRef.current = false;
    } catch (error) {
      setLoadError(getDocumentErrorMessage(error, "学习文档加载失败"));
    } finally {
      setIsLoading(false);
    }
  }, [weekId]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  const saveContent = useCallback(async (contentToSave: string) => {
    setSaveState("saving");
    setSaveError(null);

    try {
      const savedDocument = await saveLearningDocument({
        weekId,
        content: contentToSave,
      });
      setDocument(savedDocument);

      if (contentRef.current === contentToSave) {
        setContent(savedDocument.content);
        contentRef.current = savedDocument.content;
        documentRef.current = savedDocument;
        dirtyRef.current = false;
        setSaveState("saved");
      } else {
        documentRef.current = savedDocument;
        dirtyRef.current = true;
        setSaveState("idle");
      }
    } catch (error) {
      setSaveError(getDocumentErrorMessage(error, "保存失败"));
      setSaveState("error");
    }
  }, [weekId]);

  const save = useCallback(async () => {
    await saveContent(contentRef.current);
  }, [saveContent]);

  useEffect(() => {
    if (
      isLoading ||
      loadError ||
      saveState === "saving" ||
      !document ||
      content === document.content
    ) {
      return;
    }

    const autoSaveTimer = window.setTimeout(() => {
      void saveContent(contentRef.current);
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(autoSaveTimer);
  }, [content, document, isLoading, loadError, saveContent, saveState]);

  useEffect(() => {
    const saveBeforeLeaving = () => {
      if (dirtyRef.current && documentRef.current) {
        void saveContent(contentRef.current);
      }
    };

    const handleBeforeUnload = () => {
      saveBeforeLeaving();
    };

    const handleVisibilityChange = () => {
      if (window.document.visibilityState === "hidden") {
        saveBeforeLeaving();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveContent]);

  const updateContent = (nextContent: string) => {
    contentRef.current = nextContent;
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
