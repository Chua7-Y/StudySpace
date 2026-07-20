import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type CourseNameDialogProps = {
  title: string;
  confirmLabel: string;
  initialName?: string;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (name: string) => Promise<void> | void;
  onCancel: () => void;
};

export function CourseNameDialog({
  title,
  confirmLabel,
  initialName = "",
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: CourseNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setLocalError("课程名称不能为空");
      return;
    }

    setLocalError(null);
    try {
      await onSubmit(trimmedName);
    } catch {
      // The parent keeps the dialog open and renders the operation error.
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
          <span>课程名称</span>
          <input
            ref={inputRef}
            value={name}
            disabled={isSubmitting}
            onChange={(event) => setName(event.target.value)}
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
