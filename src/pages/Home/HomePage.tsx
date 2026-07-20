import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CourseList } from "../../course/components/CourseList";
import { CourseNameDialog } from "../../course/components/CourseNameDialog";
import { DeleteCourseDialog } from "../../course/components/DeleteCourseDialog";
import type { Course } from "../../course/types";
import { useCourses } from "../../course/useCourses";

type DatabaseHealth = {
  ok: boolean;
  schemaVersion: number;
  databasePath?: string;
};

type DatabaseStatus =
  | { state: "checking" }
  | { state: "ready"; schemaVersion: number }
  | { state: "error" };

type ActiveDialog =
  | { type: "create" }
  | { type: "rename"; course: Course }
  | { type: "delete"; course: Course }
  | null;

type HomePageProps = {
  onOpenCourse?: (courseId: string) => void;
};

export function HomePage({ onOpenCourse }: HomePageProps) {
  const {
    courses,
    isLoading,
    isCreating,
    updatingCourseId,
    deletingCourseId,
    error,
    actionError,
    loadCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    clearActionError,
  } = useCourses();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    state: "checking",
  });

  useEffect(() => {
    let isMounted = true;

    invoke<DatabaseHealth>("database_health_check")
      .then((health) => {
        if (!isMounted) {
          return;
        }

        if (health.ok) {
          setDatabaseStatus({
            state: "ready",
            schemaVersion: health.schemaVersion,
          });
        } else {
          setDatabaseStatus({ state: "error" });
        }
      })
      .catch(() => {
        if (isMounted) {
          setDatabaseStatus({ state: "error" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openDialog = (dialog: ActiveDialog) => {
    clearActionError();
    setActiveDialog(dialog);
  };

  return (
    <main className="home-page">
      <header className="home-header">
        <div>
          <h1>StudySpace</h1>
          <p>本地优先的课程学习资料整理空间。</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => openDialog({ type: "create" })}
        >
          新建课程
        </button>
      </header>

      <section className="course-section" aria-label="课程管理">
        {isLoading && <p className="state-message">正在加载课程……</p>}

        {!isLoading && error && (
          <div className="state-panel" role="alert">
            <h2>课程列表加载失败</h2>
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void loadCourses()}
            >
              重新加载
            </button>
          </div>
        )}

        {!isLoading && !error && courses.length === 0 && (
          <div className="state-panel">
            <h2>还没有课程</h2>
            <p>创建第一门课程，开始整理学习资料。</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => openDialog({ type: "create" })}
            >
              新建课程
            </button>
          </div>
        )}

        {!isLoading && !error && courses.length > 0 && (
          <CourseList
            courses={courses}
            updatingCourseId={updatingCourseId}
            deletingCourseId={deletingCourseId}
            onOpen={(course) => onOpenCourse?.(course.id)}
            onRename={(course) => openDialog({ type: "rename", course })}
            onDelete={(course) => openDialog({ type: "delete", course })}
          />
        )}
      </section>

      <p className="database-status">
        {databaseStatus.state === "checking" && "数据库：检查中"}
        {databaseStatus.state === "ready" &&
          `数据库：已就绪 · Schema 版本：${databaseStatus.schemaVersion}`}
        {databaseStatus.state === "error" && "数据库：错误"}
      </p>

      {activeDialog?.type === "create" && (
        <CourseNameDialog
          title="新建课程"
          confirmLabel="创建"
          isSubmitting={isCreating}
          error={actionError}
          onCancel={() => setActiveDialog(null)}
          onSubmit={async (name) => {
            await createCourse(name);
            setActiveDialog(null);
          }}
        />
      )}

      {activeDialog?.type === "rename" && (
        <CourseNameDialog
          title="重命名课程"
          confirmLabel="保存"
          initialName={activeDialog.course.name}
          isSubmitting={updatingCourseId === activeDialog.course.id}
          error={actionError}
          onCancel={() => setActiveDialog(null)}
          onSubmit={async (name) => {
            if (name === activeDialog.course.name) {
              setActiveDialog(null);
              return;
            }

            await updateCourse(activeDialog.course.id, name);
            setActiveDialog(null);
          }}
        />
      )}

      {activeDialog?.type === "delete" && (
        <DeleteCourseDialog
          course={activeDialog.course}
          isDeleting={deletingCourseId === activeDialog.course.id}
          error={actionError}
          onCancel={() => setActiveDialog(null)}
          onConfirm={async () => {
            await deleteCourse(activeDialog.course.id);
            setActiveDialog(null);
          }}
        />
      )}
    </main>
  );
}
