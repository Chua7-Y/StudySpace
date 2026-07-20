import { KeyboardEvent } from "react";
import type { Course } from "../types";

type DeleteCourseDialogProps = {
  course: Course;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function DeleteCourseDialog({
  course,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteCourseDialogProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isDeleting) {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // The parent keeps the dialog open and renders the operation error.
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <section className="dialog" aria-label="确认删除">
        <h2>确认删除</h2>
        <p>
          正在删除课程「{course.name}」。删除可能同时删除该课程下的关联内容，当前操作无法直接撤销。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={isDeleting}
            onClick={() => void handleConfirm()}
          >
            {isDeleting ? "删除中……" : "删除"}
          </button>
        </div>
      </section>
    </div>
  );
}
