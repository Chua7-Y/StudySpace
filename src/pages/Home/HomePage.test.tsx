import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../../course/types";
import { HomePage } from "./HomePage";

const serviceMocks = vi.hoisted(() => ({
  listCourses: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({ ok: true, schemaVersion: 1 }),
}));

vi.mock("../../course/courseService", () => ({
  listCourses: serviceMocks.listCourses,
  createCourse: serviceMocks.createCourse,
  updateCourse: serviceMocks.updateCourse,
  deleteCourse: serviceMocks.deleteCourse,
  getCourseErrorMessage: (error: unknown, fallback: string) =>
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

async function renderLoadedHome(courses: Course[]) {
  serviceMocks.listCourses.mockResolvedValueOnce(courses);
  render(<HomePage />);
  await waitFor(() => {
    expect(screen.queryByText("正在加载课程……")).not.toBeInTheDocument();
  });
}

describe("HomePage course management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  it("显示课程加载状态", () => {
    serviceMocks.listCourses.mockReturnValueOnce(new Promise(() => undefined));

    render(<HomePage />);

    expect(screen.getByText("正在加载课程……")).toBeInTheDocument();
  });

  it("显示空状态", async () => {
    await renderLoadedHome([]);

    expect(screen.getByText("还没有课程")).toBeInTheDocument();
    expect(
      screen.getByText("创建第一门课程，开始整理学习资料。"),
    ).toBeInTheDocument();
  });

  it("显示课程列表", async () => {
    await renderLoadedHome([
      course({ id: "course-1", name: "INFO5995" }),
      course({ id: "course-2", name: "COMP5310" }),
    ]);

    expect(screen.getByText("INFO5995")).toBeInTheDocument();
    expect(screen.getByText("COMP5310")).toBeInTheDocument();
  });

  it("创建课程成功后更新列表", async () => {
    const user = userEvent.setup();
    const createdCourse = course({ id: "course-2", name: "COMP5318" });
    serviceMocks.createCourse.mockResolvedValueOnce(createdCourse);
    await renderLoadedHome([]);

    await user.click(screen.getAllByRole("button", { name: "新建课程" })[0]);
    await user.type(screen.getByLabelText("课程名称"), " COMP5318 ");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("COMP5318")).toBeInTheDocument();
    });
    expect(serviceMocks.createCourse).toHaveBeenCalledWith({ name: "COMP5318" });
  });

  it("创建课程失败时显示错误", async () => {
    const user = userEvent.setup();
    serviceMocks.createCourse.mockRejectedValueOnce(new Error("创建失败"));
    await renderLoadedHome([]);

    await user.click(screen.getAllByRole("button", { name: "新建课程" })[0]);
    await user.type(screen.getByLabelText("课程名称"), "INFO5995");
    await user.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("创建失败");
  });

  it("空名称不会提交", async () => {
    const user = userEvent.setup();
    await renderLoadedHome([]);

    await user.click(screen.getAllByRole("button", { name: "新建课程" })[0]);
    await user.type(screen.getByLabelText("课程名称"), "   ");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("课程名称不能为空");
    expect(serviceMocks.createCourse).not.toHaveBeenCalled();
  });

  it("修改课程成功后更新名称", async () => {
    const user = userEvent.setup();
    serviceMocks.updateCourse.mockResolvedValueOnce(
      course({ id: "course-1", name: "INFO5995 Advanced" }),
    );
    await renderLoadedHome([course()]);

    await user.click(screen.getByRole("button", { name: "重命名" }));
    const input = screen.getByLabelText("课程名称");
    await user.clear(input);
    await user.type(input, "INFO5995 Advanced");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.getByText("INFO5995 Advanced")).toBeInTheDocument();
    });
    expect(serviceMocks.updateCourse).toHaveBeenCalledWith({
      id: "course-1",
      name: "INFO5995 Advanced",
    });
  });

  it("删除前显示确认", async () => {
    const user = userEvent.setup();
    await renderLoadedHome([course()]);

    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.getByLabelText("确认删除")).toBeInTheDocument();
    expect(
      screen.getByText(/正在删除课程「INFO5995」。删除可能同时删除该课程下的关联内容/),
    ).toBeInTheDocument();
  });

  it("取消删除时不调用后端", async () => {
    const user = userEvent.setup();
    await renderLoadedHome([course()]);

    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(serviceMocks.deleteCourse).not.toHaveBeenCalled();
    expect(screen.getByText("INFO5995")).toBeInTheDocument();
  });

  it("删除成功后课程从列表移除", async () => {
    const user = userEvent.setup();
    serviceMocks.deleteCourse.mockResolvedValueOnce(undefined);
    await renderLoadedHome([course()]);

    await user.click(screen.getByRole("button", { name: "删除" }));
    const dialog = screen.getByLabelText("确认删除");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByText("INFO5995")).not.toBeInTheDocument();
    });
    expect(screen.getByText("还没有课程")).toBeInTheDocument();
  });

  it("列表加载失败时显示重试操作", async () => {
    const user = userEvent.setup();
    serviceMocks.listCourses
      .mockRejectedValueOnce(new Error("课程列表加载失败"))
      .mockResolvedValueOnce([course()]);

    render(<HomePage />);

    expect(
      await screen.findByRole("heading", { name: "课程列表加载失败" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => {
      expect(screen.getByText("INFO5995")).toBeInTheDocument();
    });
  });
});
