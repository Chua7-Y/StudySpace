use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceResourceRecord {
    pub id: String,
    pub week_id: String,
    pub original_file_name: String,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub local_storage_path: String,
    pub file_size_bytes: i64,
    pub imported_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct NewSourceResource {
    pub id: String,
    pub week_id: String,
    pub original_file_name: String,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub local_storage_path: String,
    pub file_size_bytes: i64,
    pub now: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSourceResourcesInput {
    pub week_id: String,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceResourceResponse {
    pub id: String,
    pub week_id: String,
    pub original_file_name: String,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub local_storage_path: String,
    pub file_size_bytes: i64,
    pub imported_at: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<SourceResourceRecord> for SourceResourceResponse {
    fn from(resource: SourceResourceRecord) -> Self {
        Self {
            id: resource.id,
            week_id: resource.week_id,
            original_file_name: resource.original_file_name,
            file_type: resource.file_type,
            mime_type: resource.mime_type,
            local_storage_path: resource.local_storage_path,
            file_size_bytes: resource.file_size_bytes,
            imported_at: resource.imported_at,
            created_at: resource.created_at,
            updated_at: resource.updated_at,
        }
    }
}
