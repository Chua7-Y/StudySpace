use chrono::Utc;
use uuid::Uuid;

use super::error::CourseError;
use super::model::{
    CourseNameUpdate, CourseSortOrderUpdate, CreateCourseInput, NewCourse, ReorderCourseInput,
    UpdateCourseInput,
};

pub const COURSE_NAME_MAX_LENGTH: usize = 120;

pub fn build_new_course(input: CreateCourseInput) -> Result<NewCourse, CourseError> {
    Ok(NewCourse {
        id: Uuid::new_v4().to_string(),
        name: normalize_course_name(&input.name)?,
        code: normalize_optional_text(input.code),
        description: normalize_optional_text(input.description),
        sort_order: input.sort_order.unwrap_or(0),
        now: now_utc_iso8601(),
    })
}

pub fn build_course_name_update(input: UpdateCourseInput) -> Result<CourseNameUpdate, CourseError> {
    Ok(CourseNameUpdate {
        id: normalize_id(input.id)?,
        name: normalize_course_name(&input.name)?,
        updated_at: now_utc_iso8601(),
    })
}

pub fn build_course_sort_order_update(
    input: ReorderCourseInput,
) -> Result<CourseSortOrderUpdate, CourseError> {
    Ok(CourseSortOrderUpdate {
        id: normalize_id(input.id)?,
        sort_order: input.sort_order,
        updated_at: now_utc_iso8601(),
    })
}

pub fn normalize_id(id: String) -> Result<String, CourseError> {
    let normalized = id.trim().to_string();
    if normalized.is_empty() {
        return Err(CourseError::validation("课程 ID 不能为空"));
    }
    Ok(normalized)
}

fn normalize_course_name(name: &str) -> Result<String, CourseError> {
    let normalized = name.trim();

    if normalized.is_empty() {
        return Err(CourseError::validation("课程名称不能为空"));
    }

    if normalized.chars().count() > COURSE_NAME_MAX_LENGTH {
        return Err(CourseError::validation(format!(
            "课程名称不能超过 {COURSE_NAME_MAX_LENGTH} 个字符"
        )));
    }

    Ok(normalized.to_string())
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn now_utc_iso8601() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_valid_course_name() {
        let course = build_new_course(CreateCourseInput {
            name: "  INFO5995  ".to_string(),
            code: None,
            description: None,
            sort_order: None,
        })
        .unwrap();

        assert_eq!(course.name, "INFO5995");
    }

    #[test]
    fn rejects_empty_course_name() {
        let result = build_new_course(CreateCourseInput {
            name: String::new(),
            code: None,
            description: None,
            sort_order: None,
        });

        assert!(matches!(result, Err(CourseError::Validation { .. })));
    }

    #[test]
    fn rejects_whitespace_course_name() {
        let result = build_new_course(CreateCourseInput {
            name: "   ".to_string(),
            code: None,
            description: None,
            sort_order: None,
        });

        assert!(matches!(result, Err(CourseError::Validation { .. })));
    }
}
