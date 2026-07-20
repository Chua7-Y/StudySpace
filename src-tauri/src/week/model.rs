use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum WeekStatus {
    #[serde(rename = "not_organized")]
    NotOrganized,
    #[serde(rename = "organized")]
    Organized,
}

impl WeekStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::NotOrganized => "not_organized",
            Self::Organized => "organized",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "not_organized" => Some(Self::NotOrganized),
            "organized" => Some(Self::Organized),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WeekRecord {
    pub id: String,
    pub course_id: String,
    pub title: String,
    pub week_number: Option<i64>,
    pub status: WeekStatus,
    pub sort_order: i64,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWeekInput {
    pub course_id: String,
    pub title: String,
    #[serde(default)]
    pub week_number: Option<i64>,
    #[serde(default)]
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWeekInput {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWeekStatusInput {
    pub id: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderWeeksInput {
    pub course_id: String,
    pub week_ids: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct NewWeek {
    pub id: String,
    pub course_id: String,
    pub title: String,
    pub week_number: Option<i64>,
    pub status: WeekStatus,
    pub sort_order: i64,
    pub now: String,
}

#[derive(Debug, Clone)]
pub struct WeekTitleUpdate {
    pub id: String,
    pub title: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct WeekStatusUpdate {
    pub id: String,
    pub status: WeekStatus,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeekResponse {
    pub id: String,
    pub course_id: String,
    pub title: String,
    pub week_number: Option<i64>,
    pub status: WeekStatus,
    pub sort_order: i64,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<WeekRecord> for WeekResponse {
    fn from(week: WeekRecord) -> Self {
        Self {
            id: week.id,
            course_id: week.course_id,
            title: week.title,
            week_number: week.week_number,
            status: week.status,
            sort_order: week.sort_order,
            last_opened_at: week.last_opened_at,
            created_at: week.created_at,
            updated_at: week.updated_at,
        }
    }
}
