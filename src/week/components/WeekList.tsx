import {
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Week, WeekStatus } from "../types";

type WeekListProps = {
  weeks: Week[];
  updatingWeekId: string | null;
  deletingWeekId: string | null;
  isReordering: boolean;
  onRename: (week: Week) => void;
  onDelete: (week: Week) => void;
  onStatusChange: (week: Week, status: WeekStatus) => void;
  onReorder: (weekIds: string[]) => void;
};

const statusLabels: Record<WeekStatus, string> = {
  not_organized: "未整理",
  organized: "已整理",
};

export function WeekList({
  weeks,
  updatingWeekId,
  deletingWeekId,
  isReordering,
  onRename,
  onDelete,
  onStatusChange,
  onReorder,
}: WeekListProps) {
  const [draggedWeekId, setDraggedWeekId] = useState<string | null>(null);
  const [previewWeeks, setPreviewWeeks] = useState(weeks);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const previewWeeksRef = useRef(weeks);
  const originalWeekIdsRef = useRef<string[]>([]);
  const didMoveRef = useRef(false);
  const [suppressWeekClick, setSuppressWeekClick] = useState(false);
  const [menuState, setMenuState] = useState<{
    week: Week;
    x: number;
    y: number;
  } | null>(null);
  const weekIds = useMemo(
    () => previewWeeks.map((week) => week.id),
    [previewWeeks],
  );

  useEffect(() => {
    if (!draggedWeekId) {
      setPreviewWeeks(weeks);
      previewWeeksRef.current = weeks;
    }
  }, [draggedWeekId, weeks]);

  useEffect(() => {
    if (!menuState) {
      return;
    }

    const closeMenu = () => setMenuState(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [menuState]);

  useEffect(() => {
    if (!draggedWeekId) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      didMoveRef.current = true;

      const currentWeeks = previewWeeksRef.current;
      const sourceIndex = currentWeeks.findIndex(
        (week) => week.id === draggedWeekId,
      );

      if (sourceIndex < 0) {
        return;
      }

      let insertionIndex = currentWeeks.length;

      for (const [index, week] of currentWeeks.entries()) {
        if (week.id === draggedWeekId) {
          continue;
        }

        const itemElement = itemRefs.current.get(week.id);

        if (!itemElement) {
          continue;
        }

        const itemRect = itemElement.getBoundingClientRect();
        const itemMiddleY = itemRect.top + itemRect.height / 2;

        if (event.clientY < itemMiddleY) {
          insertionIndex = index;
          break;
        }
      }

      if (insertionIndex > sourceIndex) {
        insertionIndex -= 1;
      }

      if (insertionIndex === sourceIndex) {
        return;
      }

      const reorderedWeeks = [...currentWeeks];
      const [movedWeek] = reorderedWeeks.splice(sourceIndex, 1);
      reorderedWeeks.splice(insertionIndex, 0, movedWeek);
      previewWeeksRef.current = reorderedWeeks;
      setPreviewWeeks(reorderedWeeks);
    };

    const handlePointerUp = () => {
      const reorderedWeekIds = previewWeeksRef.current.map((week) => week.id);
      const didOrderChange =
        reorderedWeekIds.length === originalWeekIdsRef.current.length &&
        reorderedWeekIds.some(
          (weekId, index) => weekId !== originalWeekIdsRef.current[index],
        );

      if (didOrderChange) {
        onReorder(reorderedWeekIds);
      }

      setDraggedWeekId(null);

      if (didMoveRef.current) {
        setSuppressWeekClick(true);
        window.setTimeout(() => setSuppressWeekClick(false), 0);
      }

      didMoveRef.current = false;
      originalWeekIdsRef.current = [];
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggedWeekId, onReorder]);

  const handleContextMenu = (event: MouseEvent, week: Week, isBusy: boolean) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setMenuState({
      week,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLLIElement>,
    week: Week,
    isBusy: boolean,
  ) => {
    if (isBusy || event.button !== 0) {
      return;
    }

    setMenuState(null);
    setDraggedWeekId(week.id);
    didMoveRef.current = false;
    originalWeekIdsRef.current = weekIds;
    previewWeeksRef.current = previewWeeks;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  return (
    <div className="week-list-shell">
      <p className="week-list-hint">按住 Week 行上下拖动调整顺序，松手保存。右键打开操作菜单。</p>
      <ul className="week-list" aria-label="Week 列表">
      {previewWeeks.map((week, index) => {
        const isUpdating = updatingWeekId === week.id;
        const isDeleting = deletingWeekId === week.id;
        const isBusy = isUpdating || isDeleting || isReordering;
        const nextStatus =
          week.status === "organized" ? "not_organized" : "organized";
        const isDragging = draggedWeekId === week.id;

        return (
          <li
            className={[
              "week-item",
              isDragging ? "is-dragging" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={week.id}
            data-week-id={week.id}
            ref={(element) => {
              if (element) {
                itemRefs.current.set(week.id, element);
                return;
              }

              itemRefs.current.delete(week.id);
            }}
            onContextMenu={(event) => handleContextMenu(event, week, isBusy)}
            onPointerDown={(event) => handlePointerDown(event, week, isBusy)}
          >
            <div className="week-summary">
              <span className="week-drag-handle" aria-hidden="true">
                ::
              </span>
              <span className="week-index">第 {index + 1} 项</span>
              <button
                className="week-title-button"
                type="button"
                onClick={(event) => {
                  if (suppressWeekClick) {
                    event.preventDefault();
                    return;
                  }

                  window.alert("学习文档功能尚未实现");
                }}
              >
                {week.title}
              </button>
              <span className="week-status">{statusLabels[week.status]}</span>
            </div>
          </li>
        );
      })}
      </ul>

      {menuState && (
        <div
          className="context-menu"
          role="menu"
          style={{ left: menuState.x, top: menuState.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const nextStatus =
                menuState.week.status === "organized"
                  ? "not_organized"
                  : "organized";
              onStatusChange(menuState.week, nextStatus);
              setMenuState(null);
            }}
          >
            {menuState.week.status === "organized" ? "标记为未整理" : "标记为已整理"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onRename(menuState.week);
              setMenuState(null);
            }}
          >
            重命名
          </button>
          <button
            className="context-menu-danger"
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete(menuState.week);
              setMenuState(null);
            }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}
