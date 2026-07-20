export type WeekStatus = "not_organized" | "organized";

export type Week = {
  id: string;
  courseId: string;
  title: string;
  weekNumber: number | null;
  status: WeekStatus;
  sortOrder: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWeekInput = {
  courseId: string;
  title: string;
};

export type UpdateWeekTitleInput = {
  id: string;
  title: string;
};

export type UpdateWeekStatusInput = {
  id: string;
  status: WeekStatus;
};

export type ReorderWeeksInput = {
  courseId: string;
  weekIds: string[];
};
