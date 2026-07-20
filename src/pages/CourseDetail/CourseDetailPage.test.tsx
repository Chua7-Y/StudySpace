import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Course } from "../../course/types";
import type { Week } from "../../week/types";
import { CourseDetailPage } from "./CourseDetailPage";

const courseServiceMocks = vi.hoisted(() => ({
  getCourse: vi.fn(),
}));

const weekServiceMocks = vi.hoisted(() => ({
  listWeeks: vi.fn(),
  createWeek: vi.fn(),
  updateWeekTitle: vi.fn(),
  updateWeekStatus: vi.fn(),
  reorderWeeks: vi.fn(),
  deleteWeek: vi.fn(),
}));

vi.mock("../../course/courseService", () => ({
  getCourse: courseServiceMocks.getCourse,
  getCourseErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

vi.mock("../../week/weekService", () => ({
  listWeeks: weekServiceMocks.listWeeks,
  createWeek: weekServiceMocks.createWeek,
  updateWeekTitle: weekServiceMocks.updateWeekTitle,
  updateWeekStatus: weekServiceMocks.updateWeekStatus,
  reorderWeeks: weekServiceMocks.reorderWeeks,
  deleteWeek: weekServiceMocks.deleteWeek,
  getWeekErrorMessage: (error: unknown, fallback: string) =>
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

function weekItem(title: string): HTMLElement {
  const item = screen.getByRole("button", { name: title }).closest("li");
  expect(item).not.toBeNull();
  return item as HTMLElement;
}

async function openWeekMenu(title: string) {
  fireEvent.contextMenu(weekItem(title), {
    clientX: 120,
    clientY: 160,
  });
  return screen.findByRole("menu");
}

function dragWeek(sourceTitle: string, targetTitle: string) {
  const source = weekItem(sourceTitle);
  const target = weekItem(targetTitle);
  const items = screen
    .getAllByRole("listitem")
    .filter((item) => item.matches("[data-week-id]"));
  const sourceIndex = items.indexOf(source);
  const targetIndex = items.indexOf(target);

  source.setPointerCapture = vi.fn();

  for (const [index, item] of items.entries()) {
    const top = index * 60;
    item.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 320,
      bottom: top + 48,
      width: 320,
      height: 48,
      toJSON: () => undefined,
    }));
  }

  const targetRect = target.getBoundingClientRect();
  const targetMiddleY = targetRect.top + targetRect.height / 2;
  const dropY =
    sourceIndex < targetIndex ? targetMiddleY + 1 : targetMiddleY - 1;

  fireEvent.pointerDown(source, {
    button: 0,
    clientX: 120,
    clientY: source.getBoundingClientRect().top + 24,
    pointerId: 1,
  });
  fireEvent.pointerMove(window, {
    clientX: 120,
    clientY: dropY,
    pointerId: 1,
  });
  fireEvent.pointerUp(window, {
    clientX: 120,
    clientY: dropY,
    pointerId: 1,
  });
}

async function renderLoadedDetail(weeks: Week[] = []) {
  courseServiceMocks.getCourse.mockResolvedValueOnce(course());
  weekServiceMocks.listWeeks.mockResolvedValueOnce(weeks);
  render(<CourseDetailPage courseId="course-1" onBack={vi.fn()} />);
  await screen.findByRole("heading", { name: "INFO5995" });
  await waitFor(() => {
    expect(screen.queryByText("正在加载 Week……")).not.toBeInTheDocument();
  });
}

describe("CourseDetailPage Week management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  it("显示课程名称", async () => {
    await renderLoadedDetail([]);

    expect(screen.getByRole("heading", { name: "INFO5995" })).toBeInTheDocument();
  });

  it("显示 Week 加载状态", async () => {
    courseServiceMocks.getCourse.mockResolvedValueOnce(course());
    weekServiceMocks.listWeeks.mockReturnValueOnce(new Promise(() => undefined));

    render(<CourseDetailPage courseId="course-1" onBack={vi.fn()} />);

    expect(await screen.findByText("正在加载 Week……")).toBeInTheDocument();
  });

  it("显示 Week 空状态", async () => {
    await renderLoadedDetail([]);

    expect(screen.getByText("暂无 Week")).toBeInTheDocument();
    expect(
      screen.getByText("创建第一个 Week，开始整理这门课程。"),
    ).toBeInTheDocument();
  });

  it("显示 Week 列表", async () => {
    await renderLoadedDetail([
      week({ id: "week-1", title: "Week 1" }),
      week({ id: "week-2", title: "Week 2", sortOrder: 1 }),
    ]);

    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("Week 2")).toBeInTheDocument();
  });

  it("创建 Week 成功后列表更新", async () => {
    const user = userEvent.setup();
    const createdWeek = week({ id: "week-2", title: "Week 2", sortOrder: 1 });
    await renderLoadedDetail([]);
    weekServiceMocks.createWeek.mockResolvedValueOnce(createdWeek);
    weekServiceMocks.listWeeks.mockResolvedValueOnce([createdWeek]);

    await user.click(screen.getAllByRole("button", { name: "新建 Week" })[0]);
    await user.type(screen.getByLabelText("Week 标题"), " Week 2 ");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Week 2")).toBeInTheDocument();
    });
    expect(weekServiceMocks.createWeek).toHaveBeenCalledWith({
      courseId: "course-1",
      title: "Week 2",
    });
  });

  it("创建空标题时不提交", async () => {
    const user = userEvent.setup();
    await renderLoadedDetail([]);

    await user.click(screen.getAllByRole("button", { name: "新建 Week" })[0]);
    await user.type(screen.getByLabelText("Week 标题"), "   ");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Week 标题不能为空");
    expect(weekServiceMocks.createWeek).not.toHaveBeenCalled();
  });

  it("创建失败时显示错误", async () => {
    const user = userEvent.setup();
    weekServiceMocks.createWeek.mockRejectedValueOnce(new Error("创建失败"));
    await renderLoadedDetail([]);

    await user.click(screen.getAllByRole("button", { name: "新建 Week" })[0]);
    await user.type(screen.getByLabelText("Week 标题"), "Week 1");
    await user.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("创建失败");
  });

  it("重命名成功后标题更新", async () => {
    const user = userEvent.setup();
    weekServiceMocks.updateWeekTitle.mockResolvedValueOnce(
      week({ id: "week-1", title: "Renamed Week" }),
    );
    await renderLoadedDetail([week()]);

    await openWeekMenu("Week 1");
    await user.click(screen.getByRole("menuitem", { name: "重命名" }));
    const input = screen.getByLabelText("Week 标题");
    await user.clear(input);
    await user.type(input, "Renamed Week");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.getByText("Renamed Week")).toBeInTheDocument();
    });
  });

  it("状态切换成功后文案更新", async () => {
    const user = userEvent.setup();
    weekServiceMocks.updateWeekStatus.mockResolvedValueOnce(
      week({ id: "week-1", status: "organized" }),
    );
    await renderLoadedDetail([week()]);

    await openWeekMenu("Week 1");
    await user.click(screen.getByRole("menuitem", { name: "标记为已整理" }));

    await waitFor(() => {
      expect(screen.getByText("已整理")).toBeInTheDocument();
    });
  });

  it("状态切换失败后恢复原状态", async () => {
    const user = userEvent.setup();
    weekServiceMocks.updateWeekStatus.mockRejectedValueOnce(new Error("状态修改失败"));
    await renderLoadedDetail([week()]);

    await openWeekMenu("Week 1");
    await user.click(screen.getByRole("menuitem", { name: "标记为已整理" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("状态修改失败");
    expect(screen.getByText("未整理")).toBeInTheDocument();
  });

  it("删除前显示确认", async () => {
    const user = userEvent.setup();
    await renderLoadedDetail([week()]);

    await openWeekMenu("Week 1");
    await user.click(screen.getByRole("menuitem", { name: "删除" }));

    expect(screen.getByLabelText("确认删除 Week")).toBeInTheDocument();
    expect(screen.getByText(/正在删除 Week「Week 1」/)).toBeInTheDocument();
  });

  it("取消删除时不调用 service", async () => {
    const user = userEvent.setup();
    await renderLoadedDetail([week()]);

    await openWeekMenu("Week 1");
    await user.click(screen.getByRole("menuitem", { name: "删除" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(weekServiceMocks.deleteWeek).not.toHaveBeenCalled();
    expect(screen.getByText("Week 1")).toBeInTheDocument();
  });

  it("删除成功后列表移除", async () => {
    const user = userEvent.setup();
    weekServiceMocks.deleteWeek.mockResolvedValueOnce(undefined);
    await renderLoadedDetail([week()]);

    await openWeekMenu("Week 1");
    await user.click(screen.getByRole("menuitem", { name: "删除" }));
    await user.click(
      within(screen.getByLabelText("确认删除 Week")).getByRole("button", {
        name: "删除",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Week 1")).not.toBeInTheDocument();
    });
  });

  it("拖动到前面时调用正确的完整 ID 顺序", async () => {
    weekServiceMocks.reorderWeeks.mockResolvedValueOnce([
      week({ id: "week-2", title: "Week 2", sortOrder: 0 }),
      week({ id: "week-1", title: "Week 1", sortOrder: 1 }),
    ]);
    await renderLoadedDetail([
      week({ id: "week-1", title: "Week 1", sortOrder: 0 }),
      week({ id: "week-2", title: "Week 2", sortOrder: 1 }),
    ]);

    dragWeek("Week 2", "Week 1");

    expect(weekServiceMocks.reorderWeeks).toHaveBeenCalledWith({
      courseId: "course-1",
      weekIds: ["week-2", "week-1"],
    });
  });

  it("拖动到后面时调用正确的完整 ID 顺序", async () => {
    weekServiceMocks.reorderWeeks.mockResolvedValueOnce([
      week({ id: "week-2", title: "Week 2", sortOrder: 0 }),
      week({ id: "week-1", title: "Week 1", sortOrder: 1 }),
    ]);
    await renderLoadedDetail([
      week({ id: "week-1", title: "Week 1", sortOrder: 0 }),
      week({ id: "week-2", title: "Week 2", sortOrder: 1 }),
    ]);

    dragWeek("Week 1", "Week 2");

    expect(weekServiceMocks.reorderWeeks).toHaveBeenCalledWith({
      courseId: "course-1",
      weekIds: ["week-2", "week-1"],
    });
  });

  it("不再显示上移和下移按钮", async () => {
    await renderLoadedDetail([
      week({ id: "week-1", title: "Week 1", sortOrder: 0 }),
      week({ id: "week-2", title: "Week 2", sortOrder: 1 }),
    ]);

    expect(screen.queryByRole("button", { name: "上移" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "下移" })).not.toBeInTheDocument();
  });

  it("排序失败后恢复原顺序", async () => {
    weekServiceMocks.reorderWeeks.mockRejectedValueOnce(new Error("排序失败"));
    await renderLoadedDetail([
      week({ id: "week-1", title: "Week 1", sortOrder: 0 }),
      week({ id: "week-2", title: "Week 2", sortOrder: 1 }),
    ]);

    dragWeek("Week 1", "Week 2");

    expect(await screen.findByRole("alert")).toHaveTextContent("排序失败");
    const titles = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => text === "Week 1" || text === "Week 2");
    expect(titles).toEqual(["Week 1", "Week 2"]);
  });

  it("加载失败时显示重试", async () => {
    const user = userEvent.setup();
    courseServiceMocks.getCourse.mockResolvedValueOnce(course());
    weekServiceMocks.listWeeks
      .mockRejectedValueOnce(new Error("Week 加载失败"))
      .mockResolvedValueOnce([week()]);

    render(<CourseDetailPage courseId="course-1" onBack={vi.fn()} />);

    expect(
      await screen.findByRole("heading", { name: "Week 加载失败" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });
  });

  it("Course 不存在时显示返回操作", async () => {
    const onBack = vi.fn();
    courseServiceMocks.getCourse.mockRejectedValueOnce(
      new Error("课程不存在或已被删除。"),
    );

    render(<CourseDetailPage courseId="missing" onBack={onBack} />);

    expect(await screen.findByText("课程不存在或已被删除。")).toBeInTheDocument();
    expect(weekServiceMocks.listWeeks).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "返回课程" }));
    expect(onBack).toHaveBeenCalled();
  });
});
