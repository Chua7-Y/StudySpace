import { PointerEventHandler, useEffect, useState } from "react";
import { getCourse, getCourseErrorMessage } from "../../course/courseService";
import type { Course } from "../../course/types";
import { useLearningDocument } from "../../document/useLearningDocument";
import {
  getPreviewUrl,
  getResourceErrorMessage,
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
          minWidth: resizablePanels.minWidth,
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
        <ResourcePreview resource={resourcesState.selectedResource} />
        <ResizeHandle
          label="调整学习文档栏宽度"
          testId="right-resize-handle"
          onPointerDown={resizablePanels.startRightResize}
        />
        <LearningDocumentEditor documentState={documentState} />
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
};

function ResourcePreview({ resource }: ResourcePreviewProps) {
  return (
    <section className="workspace-panel resource-preview-panel" aria-label="原文件">
      <div className="workspace-panel-header">
        <h2>原文件</h2>
      </div>
      <ResourcePreviewContent resource={resource} />
    </section>
  );
}

function ResourcePreviewContent({ resource }: ResourcePreviewProps) {
  if (!resource) {
    return <p className="workspace-empty-message">请从左侧选择一个文件。</p>;
  }

  const kind = getResourceKind(resource.fileType || resource.originalFileName);

  if (kind === "pdf") {
    return (
      <iframe
        className="resource-pdf-preview"
        src={getPreviewUrl(resource.localStoragePath)}
        title={resource.originalFileName}
      />
    );
  }

  if (kind === "image") {
    return (
      <div className="resource-image-preview">
        <img src={getPreviewUrl(resource.localStoragePath)} alt={resource.originalFileName} />
      </div>
    );
  }

  if (kind === "text") {
    return <TextPreview resource={resource} />;
  }

  return <UnsupportedPreview resource={resource} />;
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

type LearningDocumentState = ReturnType<typeof useLearningDocument>;

function LearningDocumentEditor({
  documentState,
}: {
  documentState: LearningDocumentState;
}) {
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
          <textarea
            id="workspace-document-content"
            className="workspace-document-textarea"
            value={documentState.content}
            onChange={(event) => documentState.updateContent(event.target.value)}
            placeholder="在这里输入学习内容。"
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
