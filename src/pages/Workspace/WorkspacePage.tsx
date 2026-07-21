import {
  PointerEventHandler,
  useEffect,
  useState,
} from "react";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { getCourse, getCourseErrorMessage } from "../../course/courseService";
import type { Course } from "../../course/types";
import { LearningDocumentEditor } from "../../document/components/LearningDocumentEditor";
import type { InsertableDocumentImage } from "../../document/types";
import { useLearningDocument } from "../../document/useLearningDocument";
import {
  getResourceErrorMessage,
  readSourceResourceBytes,
  readSourceResourceText,
} from "../../resource/resourceService";
import type { SourceResource } from "../../resource/types";
import { getResourceKind, getResourceTypeLabel } from "../../resource/fileKind";
import { useResources } from "../../resource/useResources";
import { getWeek, getWeekErrorMessage } from "../../week/weekService";
import type { Week } from "../../week/types";
import { useResizablePanels } from "../../workspace/useResizablePanels";

type WorkspacePageProps = {
  courseId: string;
  weekId: string;
  onBack: () => void;
};

type WorkspaceState =
  | { state: "loading" }
  | { state: "loaded"; course: Course; week: Week }
  | { state: "courseNotFound"; message: string }
  | { state: "weekNotFound"; message: string }
  | { state: "error"; message: string };

export function WorkspacePage({ courseId, weekId, onBack }: WorkspacePageProps) {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    state: "loading",
  });

  useEffect(() => {
    let isMounted = true;
    setWorkspaceState({ state: "loading" });

    Promise.all([getCourse(courseId), getWeek(weekId)])
      .then(([course, week]) => {
        if (isMounted) {
          setWorkspaceState({ state: "loaded", course, week });
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const courseMessage = getCourseErrorMessage(error, "");
        const weekMessage = getWeekErrorMessage(error, "");
        if (courseMessage.includes("课程不存在")) {
          setWorkspaceState({
            state: "courseNotFound",
            message: "课程不存在或已被删除。",
          });
          return;
        }

        if (weekMessage.includes("Week 不存在")) {
          setWorkspaceState({
            state: "weekNotFound",
            message: "Week 不存在或已被删除。",
          });
          return;
        }

        setWorkspaceState({ state: "error", message: "Workspace 加载失败" });
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, weekId]);

  if (workspaceState.state === "loading") {
    return (
      <main className="workspace-loading-page">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <p className="state-message">正在加载 Workspace……</p>
      </main>
    );
  }

  if (workspaceState.state !== "loaded") {
    return (
      <main className="workspace-loading-page">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <div className="state-panel" role="alert">
          <h1>
            {workspaceState.state === "courseNotFound"
              ? "课程不存在"
              : workspaceState.state === "weekNotFound"
                ? "Week 不存在"
                : "Workspace 加载失败"}
          </h1>
          <p>{workspaceState.message}</p>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceContent
      course={workspaceState.course}
      week={workspaceState.week}
      onBack={onBack}
    />
  );
}

type WorkspaceContentProps = {
  course: Course;
  week: Week;
  onBack: () => void;
};

function WorkspaceContent({ course, week, onBack }: WorkspaceContentProps) {
  const resourcesState = useResources(week.id);
  const documentState = useLearningDocument(week.id);
  const resizablePanels = useResizablePanels();
  const [pendingImage, setPendingImage] = useState<InsertableDocumentImage | null>(null);
  const handleInsertImage = (image: InsertableDocumentImage) => {
    setPendingImage(image);
  };
  const saveStatus = documentState.isLoading
    ? "文档加载中"
    : documentState.isSaving
      ? "保存中"
      : documentState.saveState === "saved"
        ? "已保存"
        : documentState.saveState === "error"
          ? "保存失败"
          : documentState.isDirty
            ? "未保存"
            : "已加载";

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <div className="workspace-title">
          <span>{course.name}</span>
          <span aria-hidden="true">/</span>
          <strong>{week.title}</strong>
        </div>
        <span className="workspace-save-status" role="status">
          {saveStatus}
        </span>
      </header>

      <section
        className="workspace-grid"
        ref={resizablePanels.containerRef}
        style={{
          gridTemplateColumns: resizablePanels.gridTemplateColumns,
        }}
        aria-label="Week Workspace"
      >
        <ResourceSidebar
          resources={resourcesState.resources}
          selectedResourceId={resourcesState.selectedResourceId}
          isLoading={resourcesState.isLoading}
          isImporting={resourcesState.isImporting}
          loadError={resourcesState.loadError}
          importError={resourcesState.importError}
          onImport={() => void resourcesState.chooseAndImportResources()}
          onReload={() => void resourcesState.loadResources()}
          onSelect={resourcesState.setSelectedResourceId}
        />
        <ResizeHandle
          label="调整资料栏宽度"
          testId="left-resize-handle"
          onPointerDown={resizablePanels.startLeftResize}
        />
        <ResourcePreview
          resource={resourcesState.selectedResource}
          onInsertImage={handleInsertImage}
        />
        <ResizeHandle
          label="调整学习文档栏宽度"
          testId="right-resize-handle"
          onPointerDown={resizablePanels.startRightResize}
        />
        <LearningDocumentEditor
          documentState={documentState}
          pendingImage={pendingImage}
          onImageInserted={() => setPendingImage(null)}
        />
      </section>
    </main>
  );
}

type ResourceSidebarProps = {
  resources: SourceResource[];
  selectedResourceId: string | null;
  isLoading: boolean;
  isImporting: boolean;
  loadError: string | null;
  importError: string | null;
  onImport: () => void;
  onReload: () => void;
  onSelect: (id: string) => void;
};

function ResourceSidebar({
  resources,
  selectedResourceId,
  isLoading,
  isImporting,
  loadError,
  importError,
  onImport,
  onReload,
  onSelect,
}: ResourceSidebarProps) {
  return (
    <aside className="workspace-panel resource-sidebar" aria-label="本周资料">
      <div className="workspace-panel-header">
        <h2>本周资料</h2>
        <button
          className="secondary-button compact-button"
          type="button"
          disabled={isImporting}
          onClick={onImport}
        >
          {isImporting ? "导入中……" : "导入资料"}
        </button>
      </div>

      {isLoading && <p className="state-message">正在加载资料……</p>}

      {!isLoading && loadError && (
        <div className="workspace-inline-error" role="alert">
          <p>{loadError}</p>
          <button className="secondary-button compact-button" type="button" onClick={onReload}>
            重新加载
          </button>
        </div>
      )}

      {!isLoading && !loadError && resources.length === 0 && (
        <div className="resource-empty">
          <p>尚未导入学习资料。</p>
        </div>
      )}

      {!isLoading && !loadError && resources.length > 0 && (
        <ul className="resource-list">
          {resources.map((resource) => (
            <li key={resource.id}>
              <button
                className={[
                  "resource-list-item",
                  resource.id === selectedResourceId ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="button"
                title={resource.originalFileName}
                onClick={() => onSelect(resource.id)}
              >
                <span className="resource-type-badge">
                  {getResourceTypeLabel(resource)}
                </span>
                <span className="resource-file-name">{resource.originalFileName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {importError && (
        <p className="form-error resource-import-error" role="alert">
          {importError}
        </p>
      )}
    </aside>
  );
}

type ResourcePreviewProps = {
  resource: SourceResource | null;
  onInsertImage: (image: InsertableDocumentImage) => void;
};

function ResourcePreview({ resource, onInsertImage }: ResourcePreviewProps) {
  return (
    <section className="workspace-panel resource-preview-panel" aria-label="原文件">
      <div className="workspace-panel-header">
        <h2>原文件</h2>
      </div>
      <ResourcePreviewContent resource={resource} onInsertImage={onInsertImage} />
    </section>
  );
}

function ResourcePreviewContent({ resource, onInsertImage }: ResourcePreviewProps) {
  if (!resource) {
    return <p className="workspace-empty-message">请从左侧选择一个文件。</p>;
  }

  const kind = getResourceKind(resource.fileType || resource.originalFileName);

  if (kind === "pdf") {
    return <PdfPreview resource={resource} />;
  }

  if (kind === "image") {
    return <ImagePreview resource={resource} onInsertImage={onInsertImage} />;
  }

  if (kind === "text") {
    return <TextPreview resource={resource} />;
  }

  return <UnsupportedPreview resource={resource} />;
}

function PdfPreview({ resource }: { resource: SourceResource }) {
  type PdfZoomMode = "fitWidth" | "fitPage" | "custom";
  type PdfDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<any>;
  };

  const [state, setState] = useState<
    | { type: "loading" }
    | { type: "loaded"; pageCount: number }
    | { type: "error"; message: string }
  >({ type: "loading" });
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useState<HTMLDivElement | null>(null);
  const [containerElement, setContainerElement] = containerRef;
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [zoomMode, setZoomMode] = useState<PdfZoomMode>("fitWidth");
  const [customScale, setCustomScale] = useState(1);
  const [renderedScale, setRenderedScale] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    setPdfDocument(null);
    setState({ type: "loading" });
  }, [resource.id]);

  useEffect(() => {
    if (!containerElement) {
      return;
    }

    const updateSize = (width: number, height: number) => {
      setPreviewSize((currentSize) => {
        const nextSize = {
          width: Math.round(width),
          height: Math.round(height),
        };

        if (
          currentSize.width === nextSize.width &&
          currentSize.height === nextSize.height
        ) {
          return currentSize;
        }

        return nextSize;
      });
    };

    updateSize(containerElement.clientWidth, containerElement.clientHeight);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(containerElement);

    return () => observer.disconnect();
  }, [containerElement]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const data = await readSourceResourceBytes(resource.id);
        const pdf = await pdfjs.getDocument({
          data: new Uint8Array(data.bytes),
        }).promise;

        if (isCancelled) {
          return;
        }

        setPdfDocument(pdf as PdfDocument);
        setState({ type: "loaded", pageCount: pdf.numPages });
      } catch (error) {
        if (!isCancelled) {
          setState({
            type: "error",
            message: getResourceErrorMessage(
              error,
              "无法读取该文件，文件可能已被移动或删除。",
            ),
          });
        }
      }
    }

    void loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [resource.id]);

  useEffect(() => {
    if (!containerElement || !pdfDocument) {
      return;
    }

    const container = containerElement;
    const pdf = pdfDocument;
    let isCancelled = false;
    container.innerHTML = "";

    async function renderCurrentPage() {
      try {
        const safePage = Math.min(Math.max(currentPage, 1), pdf.numPages);
        if (safePage !== currentPage) {
          setCurrentPage(safePage);
          return;
        }
        const page = await pdf.getPage(safePage);
        if (isCancelled) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const measuredWidth = previewSize.width || container.clientWidth;
        const measuredHeight = previewSize.height || container.clientHeight;
        const availableWidth = Math.max(260, measuredWidth - 24);
        const availableHeight =
          measuredHeight > 0 ? Math.max(260, measuredHeight - 24) : baseViewport.height;
        const fitWidthScale = availableWidth / baseViewport.width;
        const fitPageScale = Math.min(
          fitWidthScale,
          availableHeight / baseViewport.height,
        );
        const scale =
          zoomMode === "fitPage"
            ? Math.min(3, Math.max(0.5, fitPageScale))
            : zoomMode === "fitWidth"
              ? Math.min(3, Math.max(0.5, fitWidthScale))
              : customScale;
        const outputScale =
          typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 3);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas 不可用");
        }

        canvas.className = "resource-pdf-page";
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        container.appendChild(canvas);
        setRenderedScale(scale);

        await page.render({
          canvasContext: context,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        }).promise;
      } catch (error) {
        if (!isCancelled) {
          setState({
            type: "error",
            message: getResourceErrorMessage(
              error,
              "无法读取该文件，文件可能已被移动或删除。",
            ),
          });
        }
      }
    }

    void renderCurrentPage();

    return () => {
      isCancelled = true;
      container.innerHTML = "";
    };
  }, [
    containerElement,
    currentPage,
    pdfDocument,
    previewSize.height,
    previewSize.width,
    customScale,
    zoomMode,
  ]);

  const zoomOut = () => {
    setZoomMode("custom");
    setCustomScale((scale) =>
      Math.max(0.5, Math.round((zoomMode === "custom" ? scale : renderedScale) * 10 - 1) / 10),
    );
  };

  const zoomIn = () => {
    setZoomMode("custom");
    setCustomScale((scale) =>
      Math.min(3, Math.round((zoomMode === "custom" ? scale : renderedScale) * 10 + 1) / 10),
    );
  };

  return (
    <div className="resource-pdf-preview">
      {state.type === "loading" && (
        <p className="state-message">正在渲染 PDF……</p>
      )}
      {state.type === "error" && (
        <p className="workspace-inline-error" role="alert">
          {state.message}
        </p>
      )}
      {state.type === "loaded" && (
        <div className="resource-pdf-toolbar">
          <button
            className="secondary-button compact-button"
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            上一页
          </button>
          <span className="resource-preview-meta">
            第 {currentPage} / {state.pageCount} 页
          </span>
          <button
            className="secondary-button compact-button"
            type="button"
            disabled={currentPage >= state.pageCount}
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(state.pageCount, page + 1),
              )
            }
          >
            下一页
          </button>
          <span className="resource-toolbar-divider" aria-hidden="true" />
          <button
            className={`secondary-button compact-button ${zoomMode === "fitWidth" ? "is-active" : ""}`}
            type="button"
            onClick={() => setZoomMode("fitWidth")}
          >
            适合宽度
          </button>
          <button
            className={`secondary-button compact-button ${zoomMode === "fitPage" ? "is-active" : ""}`}
            type="button"
            onClick={() => setZoomMode("fitPage")}
          >
            适合页面
          </button>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={zoomOut}
          >
            缩小
          </button>
          <span className="resource-preview-meta">
            {Math.round(renderedScale * 100)}%
          </span>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={zoomIn}
          >
            放大
          </button>
        </div>
      )}
      <div
        className="resource-pdf-pages"
        ref={setContainerElement}
        aria-label={`${resource.originalFileName} 预览`}
      />
    </div>
  );
}

function ImagePreview({
  resource,
  onInsertImage,
}: {
  resource: SourceResource;
  onInsertImage: (image: InsertableDocumentImage) => void;
}) {
  const [state, setState] = useState<
    | { type: "loading" }
    | { type: "loaded"; url: string }
    | { type: "error"; message: string }
  >({ type: "loading" });

  useEffect(() => {
    let objectUrl: string | null = null;
    let isCancelled = false;
    setState({ type: "loading" });

    readSourceResourceBytes(resource.id)
      .then((data) => {
        if (isCancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(data.bytes)], { type: data.mimeType }),
        );
        setState({ type: "loaded", url: objectUrl });
      })
      .catch((error) => {
        if (!isCancelled) {
          setState({
            type: "error",
            message: getResourceErrorMessage(
              error,
              "无法读取该文件，文件可能已被移动或删除。",
            ),
          });
        }
      });

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resource.id]);

  if (state.type === "loading") {
    return <p className="state-message">正在加载图片……</p>;
  }

  if (state.type === "error") {
    return (
      <p className="workspace-inline-error" role="alert">
        {state.message}
      </p>
    );
  }

  return (
    <div className="resource-image-preview-shell">
      <div className="resource-image-toolbar">
        <button
          className="primary-button compact-button"
          type="button"
          onClick={() =>
            onInsertImage({
              resourceId: resource.id,
              fileName: resource.originalFileName,
              url: state.url,
            })
          }
        >
          插入到学习文档
        </button>
      </div>
      <div className="resource-image-preview">
        <img src={state.url} alt={resource.originalFileName} />
      </div>
    </div>
  );
}

function TextPreview({ resource }: { resource: SourceResource }) {
  const [state, setState] = useState<
    | { type: "loading" }
    | { type: "loaded"; content: string }
    | { type: "error"; message: string }
  >({ type: "loading" });

  useEffect(() => {
    let isMounted = true;
    setState({ type: "loading" });

    readSourceResourceText(resource.id)
      .then((content) => {
        if (isMounted) {
          setState({ type: "loaded", content });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({
            type: "error",
            message: getResourceErrorMessage(
              error,
              "无法读取该文件，文件可能已被移动或删除。",
            ),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resource.id]);

  if (state.type === "loading") {
    return <p className="state-message">正在加载原文件……</p>;
  }

  if (state.type === "error") {
    return (
      <p className="workspace-inline-error" role="alert">
        {state.message}
      </p>
    );
  }

  return <pre className="resource-text-preview">{state.content}</pre>;
}

function UnsupportedPreview({ resource }: { resource: SourceResource }) {
  return (
    <div className="unsupported-preview">
      <p>当前版本暂不支持此格式的内嵌预览。</p>
      <dl>
        <div>
          <dt>文件名</dt>
          <dd>{resource.originalFileName}</dd>
        </div>
        <div>
          <dt>文件类型</dt>
          <dd>{resource.fileType.toUpperCase()}</dd>
        </div>
        <div>
          <dt>文件位置</dt>
          <dd>{resource.localStoragePath}</dd>
        </div>
      </dl>
    </div>
  );
}

function ResizeHandle({
  label,
  testId,
  onPointerDown,
}: {
  label: string;
  testId: string;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className="workspace-resize-handle"
      type="button"
      aria-label={label}
      data-testid={testId}
      onPointerDown={onPointerDown}
    />
  );
}
