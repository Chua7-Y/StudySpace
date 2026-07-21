use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LearningDocumentRecord {
    pub id: String,
    pub week_id: String,
    pub title: String,
    pub content_format: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct NewLearningDocument {
    pub id: String,
    pub week_id: String,
    pub title: String,
    pub content_format: String,
    pub content: String,
    pub now: String,
}

#[derive(Debug, Clone)]
pub struct LearningDocumentContentUpdate {
    pub week_id: String,
    pub content: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLearningDocumentInput {
    pub week_id: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningDocumentResponse {
    pub id: String,
    pub week_id: String,
    pub title: String,
    pub content_format: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

impl LearningDocumentResponse {
    pub fn from_record(record: LearningDocumentRecord, content: String) -> Self {
        Self {
            id: record.id,
            week_id: record.week_id,
            title: record.title,
            content_format: record.content_format,
            content,
            created_at: record.created_at,
            updated_at: record.updated_at,
        }
    }
}
