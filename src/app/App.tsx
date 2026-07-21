import { useState } from "react";
import { CourseDetailPage } from "../pages/CourseDetail/CourseDetailPage";
import { HomePage } from "../pages/HomePage";
import { WorkspacePage } from "../pages/Workspace/WorkspacePage";

export function App() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  if (selectedCourseId && selectedWeekId) {
    return (
      <WorkspacePage
        courseId={selectedCourseId}
        weekId={selectedWeekId}
        onBack={() => setSelectedWeekId(null)}
      />
    );
  }

  if (selectedCourseId) {
    return (
      <CourseDetailPage
        courseId={selectedCourseId}
        onBack={() => {
          setSelectedCourseId(null);
          setSelectedWeekId(null);
        }}
        onOpenWeek={setSelectedWeekId}
      />
    );
  }

  return <HomePage onOpenCourse={setSelectedCourseId} />;
}
