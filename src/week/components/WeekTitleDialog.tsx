import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type WeekTitleDialogProps = {
  title: string;
  confirmLabel: string;
  initialTitle?: string;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (title: string) => Promise<void> | void;
  onCancel: () => void;
};

export function WeekTitleDialog({
  title,
  confirmLabel,
  initialTitle = "",
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: WeekTitleDialogProps) {
  const [weekTitle, setWeekTitle] = useState(initialTitle);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = weekTitle.trim();

    if (!trimmedTitle) {
      setLocalError("Week 标题不能为空");
      return;
    }

    setLocalError(null);
    try {
      await onSubmit(trimmedTitle);
    } catch {
      // Parent state keeps the dialog open and displays the operation error.
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isSubmitting) {
      onCancel();
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <form
        className="dialog"
        aria-label={title}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2>{title}</h2>
        <label className="field">
          <span>Week 标题</span>
          <input
            ref={inputRef}
            value={weekTitle}
            disabled={isSubmitting}
            onChange={(event) => setWeekTitle(event.target.value)}
          />
        </label>
        {(localError || error) && (
          <p className="form-error" role="alert">
            {localError || error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            取消
          </button>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "提交中……" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
