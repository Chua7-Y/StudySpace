import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "studyspace.workspace.panelWidths";
const LEFT_DEFAULT = 220;
const RIGHT_DEFAULT = 420;
const LEFT_MIN = 160;
const MIDDLE_MIN = 300;
const RIGHT_MIN = 320;
const HANDLE_TOTAL_WIDTH = 16;

type PanelWidths = {
  left: number;
  right: number;
};

type ResizeTarget = "left" | "right";

export function useResizablePanels() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widths, setWidths] = useState<PanelWidths>(() => readStoredWidths());
  const resizeState = useRef<{
    target: ResizeTarget;
    startX: number;
    startWidths: PanelWidths;
  } | null>(null);

  useEffect(() => {
    setWidths((current) => clampWidths(current, getContainerWidth(containerRef.current)));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }, [widths]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeState.current) {
        return;
      }

      event.preventDefault();
      const delta = event.clientX - resizeState.current.startX;
      const containerWidth = getContainerWidth(containerRef.current);

      setWidths(() => {
        const { target, startWidths } = resizeState.current!;
        if (target === "left") {
          return clampWidths(
            {
              ...startWidths,
              left: startWidths.left + delta,
            },
            containerWidth,
          );
        }

        return clampWidths(
          {
            ...startWidths,
            right: startWidths.right - delta,
          },
          containerWidth,
        );
      });
    };

    const handlePointerUp = () => {
      resizeState.current = null;
      document.body.classList.remove("is-resizing-workspace");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const startResize =
    (target: ResizeTarget) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      resizeState.current = {
        target,
        startX: event.clientX,
        startWidths: widths,
      };
      document.body.classList.add("is-resizing-workspace");
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };

  return {
    containerRef,
    gridTemplateColumns: `${widths.left}px 8px minmax(${MIDDLE_MIN}px, 1fr) 8px ${widths.right}px`,
    widths,
    minWidth: LEFT_MIN + MIDDLE_MIN + RIGHT_MIN + HANDLE_TOTAL_WIDTH,
    startLeftResize: startResize("left"),
    startRightResize: startResize("right"),
  };
}

function readStoredWidths(): PanelWidths {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      parsed &&
      typeof parsed.left === "number" &&
      typeof parsed.right === "number"
    ) {
      return clampWidths(parsed, window.innerWidth || 1100);
    }
  } catch {
    return { left: LEFT_DEFAULT, right: RIGHT_DEFAULT };
  }

  return { left: LEFT_DEFAULT, right: RIGHT_DEFAULT };
}

function getContainerWidth(container: HTMLDivElement | null): number {
  const measuredWidth = container?.getBoundingClientRect().width ?? 0;
  return measuredWidth > 0 ? measuredWidth : window.innerWidth || 1100;
}

function clampWidths(widths: PanelWidths, containerWidth: number): PanelWidths {
  const availableWidth = Math.max(
    LEFT_MIN + MIDDLE_MIN + RIGHT_MIN + HANDLE_TOTAL_WIDTH,
    containerWidth,
  );
  const maxLeft = availableWidth - RIGHT_MIN - MIDDLE_MIN - HANDLE_TOTAL_WIDTH;
  const left = clamp(widths.left, LEFT_MIN, maxLeft);
  const maxRight = availableWidth - left - MIDDLE_MIN - HANDLE_TOTAL_WIDTH;
  const right = clamp(widths.right, RIGHT_MIN, maxRight);

  return { left, right };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
