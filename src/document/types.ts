export type LearningDocument = {
  id: string;
  weekId: string;
  title: string;
  contentFormat: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveLearningDocumentInput = {
  weekId: string;
  content: string;
};

export type InsertableDocumentImage = {
  resourceId: string;
  fileName: string;
  url: string;
};
