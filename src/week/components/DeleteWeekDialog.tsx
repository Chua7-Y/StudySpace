import { KeyboardEvent } from "react";
import type { Week } from "../types";

type DeleteWeekDialogProps = {
  week: Week;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function DeleteWeekDialog({
  week,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteWeekDialogProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isDeleting) {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // Parent state keeps the dialog open and displays the operation error.
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <section className="dialog" aria-label="确认删除 Week">
        <h2>确认删除</h2>
        <p>
          正在删除 Week「{week.title}」。该操作可能删除关联学习内容，当前操作无法直接撤销。
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
