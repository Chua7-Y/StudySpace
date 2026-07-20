use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CourseRecord {
    pub id: String,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: i64,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCourseInput {
    pub name: String,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCourseInput {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderCourseInput {
    pub id: String,
    pub sort_order: i64,
}

#[derive(Debug, Clone)]
pub struct NewCourse {
    pub id: String,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: i64,
    pub now: String,
}

#[derive(Debug, Clone)]
pub struct CourseNameUpdate {
    pub id: String,
    pub name: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct CourseSortOrderUpdate {
    pub id: String,
    pub sort_order: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseResponse {
    pub id: String,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: i64,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<CourseRecord> for CourseResponse {
    fn from(course: CourseRecord) -> Self {
        Self {
            id: course.id,
            name: course.name,
            code: course.code,
            description: course.description,
            sort_order: course.sort_order,
            last_opened_at: course.last_opened_at,
            created_at: course.created_at,
            updated_at: course.updated_at,
        }
    }
}
