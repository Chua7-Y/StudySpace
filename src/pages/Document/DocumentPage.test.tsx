import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningDocument } from "../../document/types";
import { DocumentPage } from "./DocumentPage";

const documentServiceMocks = vi.hoisted(() => ({
  getLearningDocument: vi.fn(),
  saveLearningDocument: vi.fn(),
}));

vi.mock("../../document/documentService", () => ({
  getLearningDocument: documentServiceMocks.getLearningDocument,
  saveLearningDocument: documentServiceMocks.saveLearningDocument,
  getDocumentErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

function document(
  overrides: Partial<LearningDocument> = {},
): LearningDocument {
  return {
    id: "document-1",
    weekId: "week-1",
    title: "Week 1",
    contentFormat: "studyspace_document_json_v1",
    content: "已有内容",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("DocumentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("显示加载状态", () => {
    documentServiceMocks.getLearningDocument.mockReturnValueOnce(
      new Promise(() => undefined),
    );

    render(<DocumentPage weekId="week-1" onBack={vi.fn()} />);

    expect(screen.getByText("正在加载学习文档……")).toBeInTheDocument();
  });

  it("显示学习文档内容", async () => {
    documentServiceMocks.getLearningDocument.mockResolvedValueOnce(document());

    render(<DocumentPage weekId="week-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Week 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("文档内容")).toHaveValue("已有内容");
  });

  it("修改内容并点击保存", async () => {
    const user = userEvent.setup();
    documentServiceMocks.getLearningDocument.mockResolvedValueOnce(document());
    documentServiceMocks.saveLearningDocument.mockResolvedValueOnce(
      document({ content: "新的学习内容" }),
    );

    render(<DocumentPage weekId="week-1" onBack={vi.fn()} />);
    const textarea = await screen.findByLabelText("文档内容");
    await user.clear(textarea);
    await user.type(textarea, "新的学习内容");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(documentServiceMocks.saveLearningDocument).toHaveBeenCalledWith({
        weekId: "week-1",
        content: "新的学习内容",
      });
    });
  });

  it("保存成功后显示已保存", async () => {
    const user = userEvent.setup();
    documentServiceMocks.getLearningDocument.mockResolvedValueOnce(document());
    documentServiceMocks.saveLearningDocument.mockResolvedValueOnce(
      document({ content: "保存后的内容" }),
    );

    render(<DocumentPage weekId="week-1" onBack={vi.fn()} />);
    await screen.findByLabelText("文档内容");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("status")).toHaveTextContent("已保存");
  });

  it("保存失败时显示错误", async () => {
    const user = userEvent.setup();
    documentServiceMocks.getLearningDocument.mockResolvedValueOnce(document());
    documentServiceMocks.saveLearningDocument.mockRejectedValueOnce(
      new Error("保存失败"),
    );

    render(<DocumentPage weekId="week-1" onBack={vi.fn()} />);
    await screen.findByLabelText("文档内容");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存失败");
  });
});
