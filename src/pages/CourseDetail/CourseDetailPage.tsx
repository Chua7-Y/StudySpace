import { useEffect, useState } from "react";
import { getCourse, getCourseErrorMessage } from "../../course/courseService";
import type { Course } from "../../course/types";
import { DeleteWeekDialog } from "../../week/components/DeleteWeekDialog";
import { WeekList } from "../../week/components/WeekList";
import { WeekTitleDialog } from "../../week/components/WeekTitleDialog";
import type { Week, WeekStatus } from "../../week/types";
import { useWeeks } from "../../week/useWeeks";

type CourseDetailPageProps = {
  courseId: string;
  onBack: () => void;
};

type CourseState =
  | { state: "loading" }
  | { state: "loaded"; course: Course }
  | { state: "notFound"; message: string }
  | { state: "error"; message: string };

export function CourseDetailPage({ courseId, onBack }: CourseDetailPageProps) {
  const [courseState, setCourseState] = useState<CourseState>({
    state: "loading",
  });

  useEffect(() => {
    let isMounted = true;

    setCourseState({ state: "loading" });
    getCourse(courseId)
      .then((course) => {
        if (isMounted) {
          setCourseState({ state: "loaded", course });
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = getCourseErrorMessage(error, "课程加载失败");
        setCourseState(
          message.includes("不存在")
            ? { state: "notFound", message: "课程不存在或已被删除。" }
            : { state: "error", message },
        );
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  if (courseState.state === "loading") {
    return (
      <main className="home-page">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回课程
        </button>
        <p className="state-message">正在加载课程……</p>
      </main>
    );
  }

  if (courseState.state === "notFound" || courseState.state === "error") {
    return (
      <main className="home-page">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回课程
        </button>
        <div className="state-panel" role="alert">
          <h1>{courseState.state === "notFound" ? "课程不存在" : "课程加载失败"}</h1>
          <p>{courseState.message}</p>
        </div>
      </main>
    );
  }

  return (
    <CourseWeeksView course={courseState.course} onBack={onBack} />
  );
}

type CourseWeeksViewProps = {
  course: Course;
  onBack: () => void;
};

type ActiveWeekDialog =
  | { type: "create" }
  | { type: "rename"; week: Week }
  | { type: "delete"; week: Week }
  | null;

function CourseWeeksView({ course, onBack }: CourseWeeksViewProps) {
  const {
    weeks,
    isLoading,
    loadError,
    actionError,
    isCreating,
    updatingWeekId,
    deletingWeekId,
    isReordering,
    loadWeeks,
    createWeek,
    updateWeekTitle,
    updateWeekStatus,
    deleteWeek,
    reorderWeekIds,
    clearActionError,
  } = useWeeks(course.id);
  const [activeDialog, setActiveDialog] = useState<ActiveWeekDialog>(null);

  const openDialog = (dialog: ActiveWeekDialog) => {
    clearActionError();
    setActiveDialog(dialog);
  };

  const handleStatusChange = async (week: Week, status: WeekStatus) => {
    try {
      await updateWeekStatus(week.id, status);
    } catch {
      // useWeeks restores state and exposes the error message.
    }
  };

  const handleReorder = async (weekIds: string[]) => {
    try {
      await reorderWeekIds(weekIds);
    } catch {
      // useWeeks restores state and exposes the error message.
    }
  };

  return (
    <main className="home-page">
      <header className="home-header course-detail-header">
        <div>
          <button className="secondary-button" type="button" onClick={onBack}>
            返回课程
          </button>
          <h1>{course.name}</h1>
          <p>管理这门课程下的 Week。</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => openDialog({ type: "create" })}
        >
          新建 Week
        </button>
      </header>

      <section className="course-section" aria-label="Week 管理">
        {actionError && !activeDialog && (
          <p className="form-error action-error" role="alert">
            {actionError}
          </p>
        )}

        {isLoading && <p className="state-message">正在加载 Week……</p>}

        {!isLoading && loadError && (
          <div className="state-panel" role="alert">
            <h2>Week 加载失败</h2>
            <p>{loadError}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void loadWeeks()}
            >
              重新加载
            </button>
          </div>
        )}

        {!isLoading && !loadError && weeks.length === 0 && (
          <div className="state-panel">
            <h2>暂无 Week</h2>
            <p>创建第一个 Week，开始整理这门课程。</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => openDialog({ type: "create" })}
            >
              新建 Week
            </button>
          </div>
        )}

        {!isLoading && !loadError && weeks.length > 0 && (
          <WeekList
            weeks={weeks}
            updatingWeekId={updatingWeekId}
            deletingWeekId={deletingWeekId}
            isReordering={isReordering}
            onRename={(week) => openDialog({ type: "rename", week })}
            onDelete={(week) => openDialog({ type: "delete", week })}
            onStatusChange={handleStatusChange}
            onReorder={handleReorder}
          />
        )}
      </section>

      {activeDialog?.type === "create" && (
        <WeekTitleDialog
          title="新建 Week"
          confirmLabel="创建"
          isSubmitting={isCreating}
          error={actionError}
          onCancel={() => setActiveDialog(null)}
          onSubmit={async (title) => {
            await createWeek(title);
            setActiveDialog(null);
          }}
        />
      )}

      {activeDialog?.type === "rename" && (
        <WeekTitleDialog
          title="重命名 Week"
          confirmLabel="保存"
          initialTitle={activeDialog.week.title}
          isSubmitting={updatingWeekId === activeDialog.week.id}
          error={actionError}
          onCancel={() => setActiveDialog(null)}
          onSubmit={async (title) => {
            if (title === activeDialog.week.title) {
              setActiveDialog(null);
              return;
            }

            await updateWeekTitle(activeDialog.week.id, title);
            setActiveDialog(null);
          }}
        />
      )}

      {activeDialog?.type === "delete" && (
        <DeleteWeekDialog
          week={activeDialog.week}
          isDeleting={deletingWeekId === activeDialog.week.id}
          error={actionError}
          onCancel={() => setActiveDialog(null)}
          onConfirm={async () => {
            await deleteWeek(activeDialog.week.id);
            setActiveDialog(null);
          }}
        />
      )}
    </main>
  );
}
