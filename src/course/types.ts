export type Course = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCourseInput = {
  name: string;
};

export type UpdateCourseInput = {
  id: string;
  name: string;
};
