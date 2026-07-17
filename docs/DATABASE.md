# StudySpace 数据库设计

本文档描述 StudySpace 第一版数据库设计草案。

当前数据库暂定使用 SQLite。

本文档只做数据库设计，不实现 Rust 数据库代码，不创建迁移程序，不安装数据库依赖。

## 1. 设计范围

第一版只覆盖以下核心实体：

* Course
* Week
* LearningDocument
* SourceResource
* ApplicationSetting

第一版不包含：

* AI 记录
* 题库
* 同步
* 文档版本历史
* 搜索索引
* 解析任务历史
* 编辑器块级数据表

## 2. 通用约定

### 2.1 主键策略

所有核心业务表的主键使用 `TEXT` 类型。

应用层负责生成稳定 ID，建议后续在实现时选择 UUID v7 或 ULID。

不建议第一版依赖 SQLite 自增整数作为业务主键，原因是：

* 后续导入、导出或迁移时更容易保持 ID 稳定。
* 如果未来加入同步，可以减少整数 ID 冲突。
* 前端和后端可以在数据真正写入数据库前先引用同一个实体 ID。

### 2.2 时间字段处理

主要表都包含：

* `created_at`
* `updated_at`

时间字段使用 `TEXT NOT NULL`，保存 UTC ISO-8601 字符串，例如：

```text
2026-07-17T08:30:00Z
```

处理规则：

* `created_at` 在创建记录时写入，之后不应修改。
* `updated_at` 在记录的有效内容发生变化时更新。
* 第一版实现时需要明确由 Rust 应用层写入时间，还是由 SQLite trigger 自动维护。
* 如果使用 trigger，需要避免递归更新。

本文 SQL 草案中使用 `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` 作为数据库默认值，以统一保存 UTC ISO-8601 字符串。

第一版实现选择：由应用层在后续写业务数据时维护 `updated_at`。

选择原因：

* 当前任务只建立数据库基础设施，还没有 Course、Week 或 LearningDocument 的写入服务。
* 如果现在为所有表添加 `updated_at` trigger，后续业务写入策略还没有稳定，容易引入递归更新或难以测试的隐式行为。
* 应用层显式更新时间更容易和未来 repository/service 边界保持一致。

因此，第一版建表 SQL 不创建 `updated_at` 自动更新 trigger。后续实现业务写入时，必须在对应 repository/service 中统一更新 `updated_at`。

### 2.3 外键约定

应用打开数据库连接后必须启用 SQLite 外键：

```sql
PRAGMA foreign_keys = ON;
```

否则 SQLite 不会强制执行外键约束和级联删除。

### 2.4 删除与原文件约定

数据库删除只负责删除数据库记录。

原始用户文件不能被数据库逻辑直接修改。

如果 StudySpace 在应用数据目录中保存了原文件副本，那么物理文件清理也必须由应用层显式处理，不能依赖 SQL 外键自动完成。

### 2.5 SQLite 运行配置

第一版数据库连接必须启用：

```sql
PRAGMA foreign_keys = ON;
```

第一版实现选择启用 WAL：

```sql
PRAGMA journal_mode = WAL;
```

选择原因：

* WAL 更适合桌面应用中“读多、偶尔写”的本地数据库场景。
* 健康检查、页面读取和后续写入操作可以减少互相阻塞。
* SQLite 仍然保持单文件主数据库模型，但会额外产生 WAL/SHM 辅助文件，这是 SQLite 的正常行为。

注意：`foreign_keys` 是连接级设置。不能假设新连接会自动启用外键约束。

## 3. 实体职责与表设计

## 3.1 Course

Course 是最高层级的学习容器，用来组织某门课程或某个学习主题。

示例：

* INFO5995
* COMP5310
* COMP5318

表名：`courses`

| 字段名 | 数据类型 | 是否允许为空 | 默认值 | 字段含义 |
| --- | --- | --- | --- | --- |
| `id` | `TEXT` | 否 | 无 | 主键。应用生成的稳定 ID。 |
| `name` | `TEXT` | 否 | 无 | 用户可见的课程名称。 |
| `code` | `TEXT` | 是 | `NULL` | 可选课程代码，例如 `INFO5995`。 |
| `description` | `TEXT` | 是 | `NULL` | 可选课程描述。 |
| `sort_order` | `INTEGER` | 否 | `0` | 课程手动排序值，数值越小越靠前。 |
| `last_opened_at` | `TEXT` | 是 | `NULL` | 课程最近一次打开时间，用于最近访问。 |
| `created_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录创建时间。 |
| `updated_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录最近更新时间。 |

主键：

* `courses.id`

外键：

* 无

## 3.2 Week

Week 是 Course 下的主要学习单元。

当前产品模型中，一个 Week 对应一个主要 LearningDocument。

表名：`weeks`

| 字段名 | 数据类型 | 是否允许为空 | 默认值 | 字段含义 |
| --- | --- | --- | --- | --- |
| `id` | `TEXT` | 否 | 无 | 主键。应用生成的稳定 ID。 |
| `course_id` | `TEXT` | 否 | 无 | 所属 Course 的 ID。 |
| `title` | `TEXT` | 否 | 无 | 用户可见的 Week 标题。 |
| `week_number` | `INTEGER` | 是 | `NULL` | 可选周次数字。不是必填，因为课程可能使用自定义命名。 |
| `status` | `TEXT` | 否 | `'not_organized'` | Week 整理状态。第一版只支持 `not_organized` 和 `organized`。 |
| `sort_order` | `INTEGER` | 否 | `0` | Week 在所属 Course 内的手动排序值，数值越小越靠前。 |
| `last_opened_at` | `TEXT` | 是 | `NULL` | Week 最近一次打开时间。 |
| `created_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录创建时间。 |
| `updated_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录最近更新时间。 |

主键：

* `weeks.id`

外键：

* `weeks.course_id` 引用 `courses.id`

约束：

* `status` 只能是 `not_organized` 或 `organized`

## 3.3 LearningDocument

LearningDocument 是用户长期使用和维护的学习文档。

它不是 PDF 批注层，也不被原始导入材料的结构强制约束。

表名：`learning_documents`

| 字段名 | 数据类型 | 是否允许为空 | 默认值 | 字段含义 |
| --- | --- | --- | --- | --- |
| `id` | `TEXT` | 否 | 无 | 主键。应用生成的稳定 ID。 |
| `week_id` | `TEXT` | 否 | 无 | 所属 Week 的 ID。该字段唯一，保证一个 Week 只有一个主要 LearningDocument。 |
| `title` | `TEXT` | 否 | 无 | 用户可见的文档标题，初始可从 Week 标题生成。 |
| `content_format` | `TEXT` | 否 | `'studyspace_document_json_v1'` | 内容序列化格式标识。 |
| `content` | `TEXT` | 否 | `'{}'` | 序列化后的学习文档内容。第一版使用 JSON 字符串存储。 |
| `created_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录创建时间。 |
| `updated_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录最近更新时间。 |

主键：

* `learning_documents.id`

外键：

* `learning_documents.week_id` 引用 `weeks.id`

约束：

* `learning_documents.week_id` 必须唯一
* `content` 应为合法 JSON

### LearningDocument 第一版内容存储方式

第一版选择把学习文档内容保存为 JSON 字符串，并存入 `TEXT content` 字段。

选择理由：

* 当前还没有选择最终编辑器库。
* JSON 可以表达标题、段落、列表、图片、代码块、表格、引用、分隔线、链接、高亮等结构化内容。
* 在编辑器方案还没有稳定前，整篇文档作为一个序列化字段更简单。
* 后续如果需要，SQLite 的 JSON 能力仍然可以对内容做有限检查或读取。

代价：

* 不方便做块级查询。
* 局部更新时通常需要重写整个 `content` 字段。
* 未来如果要支持全文搜索、版本历史、块级引用或协作冲突处理，可能需要新增文档块表或历史表。

第一版实现时，应用层保存前应验证 `content` 是合法 JSON。SQL 草案中也使用了 `CHECK (json_valid(content))`。

## 3.4 SourceResource

SourceResource 记录导入的原始文件。

原始文件是来源引用，用于导入、对比和验证。它不应该成为主要长期工作区，也不应该被 StudySpace 修改。

表名：`source_resources`

| 字段名 | 数据类型 | 是否允许为空 | 默认值 | 字段含义 |
| --- | --- | --- | --- | --- |
| `id` | `TEXT` | 否 | 无 | 主键。应用生成的稳定 ID。 |
| `week_id` | `TEXT` | 否 | 无 | 所属 Week 的 ID。 |
| `original_file_name` | `TEXT` | 否 | 无 | 导入时用户原始文件名。 |
| `file_type` | `TEXT` | 否 | 无 | 文件类型，例如 `pdf`、`pptx`、`docx`、`image`、`unknown`。 |
| `mime_type` | `TEXT` | 是 | `NULL` | 可选 MIME 类型。 |
| `local_storage_path` | `TEXT` | 否 | 无 | 本地存储路径，指向应用管理的原文件副本或本地来源文件引用。 |
| `file_size_bytes` | `INTEGER` | 否 | `0` | 导入时文件大小，单位是字节。 |
| `imported_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 文件导入 StudySpace 的时间。 |
| `created_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录创建时间，通常与 `imported_at` 一致。 |
| `updated_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 元数据最近更新时间。该字段变化不代表原文件被修改。 |

主键：

* `source_resources.id`

外键：

* `source_resources.week_id` 引用 `weeks.id`

说明：

* `original_file_name` 用于保留用户导入时看到的原始文件名。
* `file_type` 用于第一版简单分类和筛选。
* `local_storage_path` 不应指向仓库里的 `resources/` 开发目录，而应指向应用数据目录中的存储位置，或后续确定的本地文件引用方式。
* `file_size_bytes` 记录导入时文件大小。
* `imported_at` 记录导入时间。

## 3.5 ApplicationSetting

ApplicationSetting 保存本地应用设置。

第一版设置项还不稳定，所以采用简单的 key-value 结构。

表名：`application_settings`

| 字段名 | 数据类型 | 是否允许为空 | 默认值 | 字段含义 |
| --- | --- | --- | --- | --- |
| `key` | `TEXT` | 否 | 无 | 主键。稳定设置键，例如 `ui.theme`。 |
| `value` | `TEXT` | 否 | 无 | 设置值，统一以字符串形式保存。 |
| `value_type` | `TEXT` | 否 | `'string'` | 值类型标识：`string`、`number`、`boolean`、`json`。 |
| `created_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 记录创建时间。 |
| `updated_at` | `TEXT` | 否 | `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` | 设置最近更新时间。 |

主键：

* `application_settings.key`

外键：

* 无

说明：

* 如果 `value_type` 是 `json`，应用层保存前应验证 `value` 是合法 JSON。
* Provider token、密钥、凭证等敏感信息不应明文存入该表。后续需要单独设计安全存储。

## 4. 实体关系

实体关系如下：

* 一个 Course 可以有多个 Week。
* 一个 Week 属于一个 Course。
* 一个 Week 只对应一个主要 LearningDocument。
* 一个 LearningDocument 属于一个 Week。
* 一个 Week 可以有多个 SourceResource。
* 一个 SourceResource 属于一个 Week。
* ApplicationSetting 是独立设置表，不依赖 Course 或 Week。

关系图：

```text
Course 1 ── * Week
Week   1 ── 1 LearningDocument
Week   1 ── * SourceResource
```

其中 Week 和 LearningDocument 的一对一关系通过 `learning_documents.week_id UNIQUE` 保证。

## 5. 删除规则

### 5.1 删除 Course

删除 Course 时，应级联删除：

* Course 下的所有 Week
* 每个 Week 对应的 LearningDocument
* 每个 Week 下的 SourceResource 元数据

外键规则：

* `weeks.course_id ON DELETE CASCADE`

产品含义：

* 删除 Course 是高风险操作，界面上应要求用户明确确认。
* 数据库级联删除的是数据库内容和元数据，不代表直接删除或修改用户原始文件。

### 5.2 删除 Week

删除 Week 时，应级联删除：

* 该 Week 的 LearningDocument
* 该 Week 下的 SourceResource 元数据

外键规则：

* `learning_documents.week_id ON DELETE CASCADE`
* `source_resources.week_id ON DELETE CASCADE`

产品含义：

* Week 拥有主要学习文档，因此删除 Week 也应要求用户确认。

### 5.3 删除 LearningDocument

当前产品模型要求一个 Week 对应一个主要 LearningDocument。

第一版不建议提供直接删除 LearningDocument 的用户入口。

推荐规则：

* 如果用户要移除整个学习单元，应删除 Week。
* 如果未来需要单独删除 LearningDocument，必须先定义 Week 状态如何回退，以及导入流程如何恢复。

### 5.4 删除 SourceResource

删除 SourceResource 只删除来源文件的数据库元数据。

它不能修改用户原始文件。

如果 StudySpace 保存了应用管理的原文件副本，是否同时删除该副本，需要由应用层在用户确认后处理。

### 5.5 删除 ApplicationSetting

删除 ApplicationSetting 后，应用应回退到内置默认设置。

## 6. Course 和 Week 的排序方式

### 6.1 Course 排序

Course 推荐排序规则：

1. `sort_order ASC`
2. `last_opened_at DESC`
3. `created_at ASC`
4. `name ASC`

`sort_order` 是手动排序的主要依据。

建议应用层使用稀疏整数，例如 `1000`、`2000`、`3000`，这样调整顺序时不一定需要重写所有记录。

### 6.2 Week 排序

Week 在所属 Course 内推荐排序规则：

1. `sort_order ASC`
2. `week_number ASC`
3. `created_at ASC`
4. `title ASC`

`sort_order` 是主要排序依据。

`week_number` 只是可选显示和辅助排序字段，不应成为唯一排序依据，因为有些课程可能不是标准周次命名。

## 7. 完整 SQLite 建表 SQL 草案

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE weeks (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  week_number INTEGER,
  status TEXT NOT NULL DEFAULT 'not_organized'
    CHECK (status IN ('not_organized', 'organized')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE learning_documents (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'studyspace_document_json_v1',
  content TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(content)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (week_id)
    REFERENCES weeks(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE source_resources (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  local_storage_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0
    CHECK (file_size_bytes >= 0),
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (week_id)
    REFERENCES weeks(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE application_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string'
    CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

## 8. 推荐索引

```sql
CREATE INDEX idx_courses_sort
  ON courses(sort_order, last_opened_at, created_at, name);

CREATE INDEX idx_weeks_course_sort
  ON weeks(course_id, sort_order, week_number, created_at, title);

CREATE INDEX idx_weeks_course_status
  ON weeks(course_id, status);

CREATE INDEX idx_learning_documents_week
  ON learning_documents(week_id);

CREATE INDEX idx_learning_documents_updated_at
  ON learning_documents(updated_at);

CREATE INDEX idx_source_resources_week
  ON source_resources(week_id);

CREATE INDEX idx_source_resources_week_type
  ON source_resources(week_id, file_type);

CREATE INDEX idx_source_resources_imported_at
  ON source_resources(imported_at);
```

说明：

* `idx_learning_documents_week` 和 `UNIQUE (week_id)` 在实际查询计划中可能重复。实现时可以用 `EXPLAIN QUERY PLAN` 确认是否需要保留。
* 第一版没有创建全文搜索索引，因为当前任务不实现搜索功能。

## 9. 未来数据库迁移注意事项

未来实现迁移时需要注意：

* 第一版已经使用 `schema_migrations` 记录迁移版本。
* 迁移脚本必须按顺序执行，并且能处理用户跨版本升级。
* 不要假设所有用户都会经过每一个中间版本。
* 迁移时要保留 `TEXT` 类型的实体 ID。
* 不要在没有备份和兼容策略的情况下批量改写 `learning_documents.content`。
* 如果文档序列化格式改变，应新增 `content_format` 值，而不是悄悄改变旧格式含义。
* 如果未来引入编辑器块表，需要设计从 `learning_documents.content` 到块表的迁移路径。
* 如果未来引入全文搜索，FTS 表应视为可重建的派生索引。
* 如果未来引入版本历史，不应复用 `updated_at` 表达历史记录，应新增历史表。
* 如果未来引入同步，仅靠时间戳不足以处理冲突。
* 如果未来引入 AI，AI 建议应与用户确认后的 LearningDocument 内容分开存储。
* 如果未来需要清理 app-managed 原文件副本，文件删除逻辑应放在应用层，不应藏在 SQL 迁移里。
* 如果设置中需要保存 token 或凭证，应使用安全存储，不应明文放入 `application_settings`。

## 10. 仍未确定的数据库决策

以下事项留到实现或原型阶段再定：

* ID 使用 UUID v7 还是 ULID。
* `created_at` 和 `updated_at` 由 Rust 应用层维护，还是由 SQLite trigger 维护。
* `learning_documents.content` 的具体 JSON 结构。
* `source_resources.local_storage_path` 使用绝对路径、应用数据目录相对路径，还是 URI-like 标识。
* 删除 SourceResource 时，是否默认删除应用管理的文件副本。
* Course 的 `code` 是否需要唯一。第一版不强制唯一，因为不同学期可能复用课程代码。
* 创建 Week 时是否立即创建空 LearningDocument，还是等首次导入或整理时再创建。

## 11. 产品一致性检查

当前数据库设计与 `PROJECT_SPEC.md` 没有发现冲突。

该设计支持：

* 本地优先存储
* Course 到 Week 的组织结构
* 一个 Week 对应一个主要 LearningDocument
* 一个 Week 拥有多个 SourceResource
* 数据库层面不修改原始文件
* 第一版 Week 状态只包含 `not_organized` 和 `organized`

不需要修改 `PROJECT_SPEC.md`。

当前也不需要修改 `ARCHITECTURE.md`。等后续真正选择 SQLite 访问层、迁移工具和本地文件存储策略后，可以再更新架构文档。
