import type { Course } from "../types";

type CourseListProps = {
  courses: Course[];
  updatingCourseId: string | null;
  deletingCourseId: string | null;
  onRename: (course: Course) => void;
  onDelete: (course: Course) => void;
};

export function CourseList({
  courses,
  updatingCourseId,
  deletingCourseId,
  onRename,
  onDelete,
}: CourseListProps) {
  return (
    <ul className="course-list" aria-label="课程列表">
      {courses.map((course) => {
        const isUpdating = updatingCourseId === course.id;
        const isDeleting = deletingCourseId === course.id;

        return (
          <li className="course-item" key={course.id}>
            <button
              className="course-card"
              type="button"
              onClick={() => {
                window.alert("Week 功能尚未实现");
              }}
            >
              <span className="course-name">{course.name}</span>
              <span className="course-meta">Week 功能尚未实现</span>
            </button>
            <div className="course-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={isUpdating || isDeleting}
                onClick={() => onRename(course)}
              >
                {isUpdating ? "修改中……" : "重命名"}
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={isUpdating || isDeleting}
                onClick={() => onDelete(course)}
              >
                {isDeleting ? "删除中……" : "删除"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
