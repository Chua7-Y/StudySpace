import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../../course/types";
import type { LearningDocument } from "../../document/types";
import type { SourceResource } from "../../resource/types";
import type { Week } from "../../week/types";
import { WorkspacePage } from "./WorkspacePage";

const courseServiceMocks = vi.hoisted(() => ({
  getCourse: vi.fn(),
}));

const weekServiceMocks = vi.hoisted(() => ({
  getWeek: vi.fn(),
}));

const documentServiceMocks = vi.hoisted(() => ({
  getLearningDocument: vi.fn(),
  saveLearningDocument: vi.fn(),
}));

const resourceServiceMocks = vi.hoisted(() => ({
  chooseSourceResourcePaths: vi.fn(),
  listSourceResources: vi.fn(),
  importSourceResources: vi.fn(),
  readSourceResourceText: vi.fn(),
  getPreviewUrl: vi.fn(),
}));

vi.mock("../../course/courseService", () => ({
  getCourse: courseServiceMocks.getCourse,
  getCourseErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

vi.mock("../../week/weekService", () => ({
  getWeek: weekServiceMocks.getWeek,
  getWeekErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

vi.mock("../../document/documentService", () => ({
  getLearningDocument: documentServiceMocks.getLearningDocument,
  saveLearningDocument: documentServiceMocks.saveLearningDocument,
  getDocumentErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

vi.mock("../../resource/resourceService", () => ({
  chooseSourceResourcePaths: resourceServiceMocks.chooseSourceResourcePaths,
  listSourceResources: resourceServiceMocks.listSourceResources,
  importSourceResources: resourceServiceMocks.importSourceResources,
  readSourceResourceText: resourceServiceMocks.readSourceResourceText,
  getPreviewUrl: resourceServiceMocks.getPreviewUrl,
  getResourceErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-1",
    name: "INFO5995",
    code: null,
    description: null,
    sortOrder: 0,
    lastOpenedAt: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function week(overrides: Partial<Week> = {}): Week {
  return {
    id: "week-1",
    courseId: "course-1",
    title: "Week 1",
    weekNumber: null,
    status: "not_organized",
    sortOrder: 0,
    lastOpenedAt: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function document(
  overrides: Partial<LearningDocument> = {},
): LearningDocument {
  return {
    id: "document-1",
    weekId: "week-1",
    title: "Week 1",
    contentFormat: "studyspace_document_json_v1",
    content: "原文档内容",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function resource(overrides: Partial<SourceResource> = {}): SourceResource {
  const fileName = overrides.originalFileName ?? "lecture03.pdf";
  const fileType = overrides.fileType ?? fileName.split(".").pop() ?? "pdf";

  return {
    id: "resource-1",
    weekId: "week-1",
    originalFileName: fileName,
    fileType,
    mimeType: null,
    localStoragePath: `/tmp/${fileName}`,
    fileSizeBytes: 100,
    importedAt: "2026-07-20T00:00:00.000Z",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

async function renderWorkspace({
  resources = [resource()],
  documentPromise = Promise.resolve(document()),
}: {
  resources?: SourceResource[];
  documentPromise?: Promise<LearningDocument>;
} = {}) {
  courseServiceMocks.getCourse.mockResolvedValueOnce(course());
  weekServiceMocks.getWeek.mockResolvedValueOnce(week());
  resourceServiceMocks.listSourceResources.mockResolvedValueOnce(resources);
  documentServiceMocks.getLearningDocument.mockReturnValueOnce(documentPromise);
  resourceServiceMocks.getPreviewUrl.mockImplementation((path: string) => `asset://${path}`);

  render(
    <WorkspacePage courseId="course-1" weekId="week-1" onBack={vi.fn()} />,
  );

  await screen.findByText("INFO5995");
  await screen.findByText("Week 1");
}

function workspaceGrid(): HTMLElement {
  return screen.getByLabelText("Week Workspace");
}

function previewPanel(): HTMLElement {
  return screen.getByRole("region", { name: "原文件" });
}

function documentPanel(): HTMLElement {
  return screen.getByRole("region", { name: "学习文档" });
}

describe("WorkspacePage", () => {
  const localStorageData = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageData.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageData.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          localStorageData.delete(key);
        }),
        clear: vi.fn(() => {
          localStorageData.clear();
        }),
      },
    });
  });

  it("显示三栏", async () => {
    await renderWorkspace();

    expect(screen.getByRole("complementary", { name: "本周资料" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "原文件" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "学习文档" })).toBeInTheDocument();
  });

  it("第一栏显示多个资源文件", async () => {
    await renderWorkspace({
      resources: [
        resource({ id: "resource-1", originalFileName: "lecture03.pdf" }),
        resource({ id: "resource-2", originalFileName: "tutorial03.pdf" }),
      ],
    });

    expect(screen.getByText("lecture03.pdf")).toBeInTheDocument();
    expect(screen.getByText("tutorial03.pdf")).toBeInTheDocument();
  });

  it("点击不同资源时更新第二栏", async () => {
    const user = userEvent.setup();
    await renderWorkspace({
      resources: [
        resource({ id: "resource-1", originalFileName: "lecture03.pdf" }),
        resource({ id: "resource-2", originalFileName: "tutorial03.pdf" }),
      ],
    });

    expect(within(previewPanel()).getByTitle("lecture03.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tutorial03.pdf/ }));

    expect(within(previewPanel()).getByTitle("tutorial03.pdf")).toBeInTheDocument();
  });

  it("切换资源不影响第三栏内容", async () => {
    const user = userEvent.setup();
    await renderWorkspace({
      resources: [
        resource({ id: "resource-1", originalFileName: "lecture03.pdf" }),
        resource({ id: "resource-2", originalFileName: "diagram.png", fileType: "png" }),
      ],
    });

    const editor = await screen.findByLabelText("文档内容");
    await user.clear(editor);
    await user.type(editor, "未保存的新内容");
    await user.click(screen.getByRole("button", { name: /diagram.png/ }));

    expect(screen.getByLabelText("文档内容")).toHaveValue("未保存的新内容");
  });

  it("无资源时显示空状态", async () => {
    await renderWorkspace({ resources: [] });

    expect(screen.getByText("尚未导入学习资料。")).toBeInTheDocument();
    expect(screen.getByText("请从左侧选择一个文件。")).toBeInTheDocument();
  });

  it("导入按钮触发文件选择流程", async () => {
    const user = userEvent.setup();
    resourceServiceMocks.chooseSourceResourcePaths.mockResolvedValueOnce(null);
    await renderWorkspace({ resources: [] });

    await user.click(screen.getByRole("button", { name: "导入资料" }));

    expect(resourceServiceMocks.chooseSourceResourcePaths).toHaveBeenCalledTimes(1);
    expect(resourceServiceMocks.importSourceResources).not.toHaveBeenCalled();
  });

  it("多文件导入后全部出现在列表", async () => {
    const user = userEvent.setup();
    const importedResources = [
      resource({ id: "resource-1", originalFileName: "lecture.pdf" }),
      resource({ id: "resource-2", originalFileName: "tutorial.pdf" }),
    ];
    resourceServiceMocks.chooseSourceResourcePaths.mockResolvedValueOnce([
      "/tmp/lecture.pdf",
      "/tmp/tutorial.pdf",
    ]);
    resourceServiceMocks.importSourceResources.mockResolvedValueOnce(importedResources);
    await renderWorkspace({ resources: [] });

    await user.click(screen.getByRole("button", { name: "导入资料" }));

    expect(resourceServiceMocks.importSourceResources).toHaveBeenCalledWith({
      weekId: "week-1",
      paths: ["/tmp/lecture.pdf", "/tmp/tutorial.pdf"],
    });
    expect(await screen.findByText("lecture.pdf")).toBeInTheDocument();
    expect(screen.getByText("tutorial.pdf")).toBeInTheDocument();
  });

  it("PDF 类型进入 PDF Preview 分支", async () => {
    await renderWorkspace({
      resources: [resource({ originalFileName: "lecture.pdf", fileType: "pdf" })],
    });

    expect(within(previewPanel()).getByTitle("lecture.pdf")).toHaveAttribute(
      "src",
      "asset:///tmp/lecture.pdf",
    );
  });

  it("图片类型进入 Image Preview 分支", async () => {
    await renderWorkspace({
      resources: [resource({ originalFileName: "diagram.png", fileType: "png" })],
    });

    expect(screen.getByAltText("diagram.png")).toHaveAttribute(
      "src",
      "asset:///tmp/diagram.png",
    );
  });

  it("Office 文件进入 Unsupported Preview 分支", async () => {
    await renderWorkspace({
      resources: [resource({ originalFileName: "slides.pptx", fileType: "pptx" })],
    });

    expect(screen.getByText("当前版本暂不支持此格式的内嵌预览。")).toBeInTheDocument();
    expect(within(previewPanel()).getByText("slides.pptx")).toBeInTheDocument();
  });

  it("Document Loading 状态", async () => {
    await renderWorkspace({
      documentPromise: new Promise(() => undefined),
    });

    expect(screen.getByText("正在加载学习文档……")).toBeInTheDocument();
  });

  it("Document 保存成功", async () => {
    const user = userEvent.setup();
    documentServiceMocks.saveLearningDocument.mockResolvedValueOnce(
      document({ content: "保存后的内容" }),
    );
    await renderWorkspace();
    const editor = await screen.findByLabelText("文档内容");
    await user.clear(editor);
    await user.type(editor, "保存后的内容");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await screen.findAllByText("已保存");
    expect(within(documentPanel()).getByText("已保存")).toBeInTheDocument();
  });

  it("Document 保存失败", async () => {
    const user = userEvent.setup();
    documentServiceMocks.saveLearningDocument.mockRejectedValueOnce(
      new Error("保存失败"),
    );
    await renderWorkspace();
    await user.click(await screen.findByRole("button", { name: "保存" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存失败");
  });

  it("拖动第一个分隔条改变栏宽", async () => {
    await renderWorkspace();
    const before = workspaceGrid().style.gridTemplateColumns;

    fireEvent.pointerDown(screen.getByTestId("left-resize-handle"), {
      clientX: 220,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 280, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 280, pointerId: 1 });

    expect(workspaceGrid().style.gridTemplateColumns).not.toBe(before);
    expect(workspaceGrid().style.gridTemplateColumns).toContain("280px");
  });

  it("拖动第二个分隔条改变栏宽", async () => {
    await renderWorkspace();
    const before = workspaceGrid().style.gridTemplateColumns;

    fireEvent.pointerDown(screen.getByTestId("right-resize-handle"), {
      clientX: 700,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 650, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 650, pointerId: 1 });

    expect(workspaceGrid().style.gridTemplateColumns).not.toBe(before);
    expect(workspaceGrid().style.gridTemplateColumns).toContain("470px");
  });

  it("栏宽不低于最小值", async () => {
    await renderWorkspace();

    fireEvent.pointerDown(screen.getByTestId("left-resize-handle"), {
      clientX: 220,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: -200, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: -200, pointerId: 1 });

    expect(workspaceGrid().style.gridTemplateColumns).toContain("160px");
  });

  it("localStorage 中的栏宽可以恢复", async () => {
    localStorage.setItem(
      "studyspace.workspace.panelWidths",
      JSON.stringify({ left: 260, right: 360 }),
    );

    await renderWorkspace();

    expect(workspaceGrid().style.gridTemplateColumns).toContain("260px");
    expect(workspaceGrid().style.gridTemplateColumns).toContain("360px");
  });
});
