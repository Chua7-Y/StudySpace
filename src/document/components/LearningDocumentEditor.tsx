import {
  PointerEventHandler,
  useEffect,
  useRef,
} from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { readSourceResourceBytes } from "../../resource/resourceService";
import type { InsertableDocumentImage } from "../types";
import type { useLearningDocument } from "../useLearningDocument";

type LearningDocumentState = ReturnType<typeof useLearningDocument>;

type LearningDocumentEditorProps = {
  documentState: LearningDocumentState;
  pendingImage: InsertableDocumentImage | null;
  onImageInserted: () => void;
};

export function LearningDocumentEditor({
  documentState,
  pendingImage,
  onImageInserted,
}: LearningDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastAppliedContentRef = useRef<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const imageResizeRef = useRef<{
    image: HTMLImageElement;
    startX: number;
    startWidth: number;
  } | null>(null);

  const syncEditorContent = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const content = serializeDocumentEditor(editor);
    lastAppliedContentRef.current = content;
    documentState.updateContent(content);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || documentState.isLoading || documentState.loadError) {
      return;
    }

    if (lastAppliedContentRef.current === documentState.content) {
      return;
    }

    editor.innerHTML = toEditorHtml(documentState.content);
    lastAppliedContentRef.current = documentState.content;
  }, [documentState.content, documentState.isLoading, documentState.loadError]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const currentEditor = editor;

    let isCancelled = false;

    async function hydrateImages() {
      const images = Array.from(
        currentEditor.querySelectorAll<HTMLImageElement>("img[data-resource-id]"),
      );

      await Promise.all(
        images.map(async (image) => {
          const resourceId = image.dataset.resourceId;
          if (!resourceId || image.src) {
            return;
          }

          try {
            const data = await readSourceResourceBytes(resourceId);
            if (isCancelled) {
              return;
            }

            const objectUrl = URL.createObjectURL(
              new Blob([new Uint8Array(data.bytes)], { type: data.mimeType }),
            );
            objectUrlsRef.current.push(objectUrl);
            image.src = objectUrl;
          } catch (error) {
            console.error("加载文档图片失败", error);
            image.alt = image.alt || "图片加载失败";
          }
        }),
      );
    }

    void hydrateImages();

    return () => {
      isCancelled = true;
    };
  }, [documentState.content]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !pendingImage) {
      return;
    }

    const figure = createImageFigure(pendingImage);
    if (editor.textContent?.trim() || editor.querySelector(".document-image-block")) {
      editor.appendChild(createEditableParagraph());
    }
    const paragraphAfterImage = createEditableParagraph();
    editor.appendChild(figure);
    editor.appendChild(paragraphAfterImage);
    syncEditorContent();
    onImageInserted();
    editor.focus();
    placeCaretAtEnd(paragraphAfterImage);
  }, [pendingImage, onImageInserted]);

  const handleEditorPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    const resizeHandle = target.closest<HTMLElement>(
      "[data-image-action='resize']",
    );
    if (!resizeHandle) {
      return;
    }

    event.preventDefault();
    const figure = resizeHandle.closest<HTMLElement>(".document-image-block");
    const image = figure?.querySelector<HTMLImageElement>("img[data-resource-id]");
    if (!figure || !image) {
      return;
    }

    imageResizeRef.current = {
      image,
      startX: event.clientX,
      startWidth: Number.parseInt(image.style.width, 10) || image.offsetWidth || 480,
    };
    resizeHandle.setPointerCapture?.(event.pointerId);
    figure.classList.add("is-resizing");
  };

  const handleEditorPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const resizeState = imageResizeRef.current;
    if (!resizeState) {
      return;
    }

    event.preventDefault();
    const nextWidth = Math.min(
      1200,
      Math.max(160, resizeState.startWidth + event.clientX - resizeState.startX),
    );
    resizeState.image.style.width = `${Math.round(nextWidth)}px`;
  };

  const handleEditorPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    const resizeState = imageResizeRef.current;
    if (!resizeState) {
      return;
    }

    const target = event.target as HTMLElement;
    target.releasePointerCapture?.(event.pointerId);
    resizeState.image
      .closest<HTMLElement>(".document-image-block")
      ?.classList.remove("is-resizing");
    imageResizeRef.current = null;
    syncEditorContent();
  };

  const handleEditorClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const deleteButton = target.closest<HTMLButtonElement>(
      "[data-image-action='delete']",
    );
    if (!deleteButton) {
      return;
    }

    event.preventDefault();
    const figure = deleteButton.closest<HTMLElement>(".document-image-block");
    if (figure) {
      figure.remove();
      syncEditorContent();
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void documentState.save();
    }
  };

  return (
    <section className="workspace-panel learning-document-panel" aria-label="学习文档">
      <div className="workspace-panel-header">
        <h2>学习文档</h2>
      </div>

      {documentState.isLoading && (
        <p className="state-message">正在加载学习文档……</p>
      )}

      {!documentState.isLoading && documentState.loadError && (
        <div className="workspace-inline-error" role="alert">
          <p>{documentState.loadError}</p>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={() => void documentState.loadDocument()}
          >
            重新加载
          </button>
        </div>
      )}

      {!documentState.isLoading && !documentState.loadError && (
        <div className="workspace-document-editor">
          <label className="document-textarea-label" htmlFor="workspace-document-content">
            文档内容
          </label>
          <div
            id="workspace-document-content"
            ref={editorRef}
            className="workspace-document-rich-editor"
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-label="文档内容"
            data-placeholder="在这里输入学习内容。"
            onInput={syncEditorContent}
            onClick={handleEditorClick}
            onKeyDown={handleEditorKeyDown}
            onPointerDown={handleEditorPointerDown}
            onPointerMove={handleEditorPointerMove}
            onPointerUp={handleEditorPointerUp}
            onPointerCancel={handleEditorPointerUp}
          />
          <div className="document-actions">
            <button
              className="primary-button"
              type="button"
              disabled={documentState.isSaving}
              onClick={() => void documentState.save()}
            >
              {documentState.isSaving ? "保存中……" : "保存"}
            </button>
            {documentState.isSaving && (
              <span className="document-status">正在保存……</span>
            )}
            {documentState.saveState === "saved" && (
              <span className="document-status">已保存</span>
            )}
            {documentState.isDirty && documentState.saveState !== "saved" && (
              <span className="document-unsaved-status">未保存</span>
            )}
            {documentState.saveError && (
              <span className="form-error document-save-error" role="alert">
                {documentState.saveError}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function toEditorHtml(content: string): string {
  const trimmedContent = content.trim();
  if (
    trimmedContent.includes("data-studyspace-document") ||
    trimmedContent.includes("document-image-block")
  ) {
    return content;
  }

  return escapeHtml(content)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>") || "<br>"}</p>`)
    .join("");
}

function serializeDocumentEditor(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".document-image-delete").forEach((controls) => {
    controls.remove();
  });
  clone.querySelectorAll(".document-image-resize-handle").forEach((handle) => {
    handle.remove();
  });
  clone.querySelectorAll<HTMLImageElement>("img[data-resource-id]").forEach((image) => {
    image.removeAttribute("src");
  });
  return clone.innerHTML;
}

function createImageFigure(image: InsertableDocumentImage): HTMLElement {
  const figure = document.createElement("figure");
  figure.className = "document-image-block";
  figure.dataset.studyspaceDocument = "image";
  figure.contentEditable = "false";

  const element = document.createElement("img");
  element.dataset.resourceId = image.resourceId;
  element.alt = image.fileName;
  element.src = image.url;
  element.style.width = "480px";

  const deleteButton = document.createElement("button");
  deleteButton.className = "document-image-delete";
  deleteButton.type = "button";
  deleteButton.dataset.imageAction = "delete";
  deleteButton.textContent = "删除";

  const resizeHandle = document.createElement("span");
  resizeHandle.className = "document-image-resize-handle";
  resizeHandle.dataset.imageAction = "resize";
  resizeHandle.setAttribute("role", "slider");
  resizeHandle.setAttribute("aria-label", "拖动调整图片大小");
  resizeHandle.setAttribute("aria-valuemin", "160");
  resizeHandle.setAttribute("aria-valuemax", "1200");

  figure.appendChild(element);
  figure.appendChild(deleteButton);
  figure.appendChild(resizeHandle);
  return figure;
}

function createEditableParagraph(): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.appendChild(document.createElement("br"));
  return paragraph;
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
