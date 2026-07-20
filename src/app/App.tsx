import { useState } from "react";
import { CourseDetailPage } from "../pages/CourseDetail/CourseDetailPage";
import { HomePage } from "../pages/HomePage";

export function App() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  if (selectedCourseId) {
    return (
      <CourseDetailPage
        courseId={selectedCourseId}
        onBack={() => setSelectedCourseId(null)}
      />
    );
  }

  return <HomePage onOpenCourse={setSelectedCourseId} />;
}
