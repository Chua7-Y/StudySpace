StudySpace 架构

1. 架构状态

本文档描述 StudySpace 的初始技术方向。

它预计会在实现过程中发生变化。

产品行为必须与 PROJECT_SPEC.md 保持一致。

当实现决策与产品规格冲突时，除非产品需求被明确修改，否则应调整实现。

⸻

2. 架构目标

架构应支持：

* 本地优先（Local-first）运行
* 桌面端部署
* 可靠的本地持久化
* 模块化功能开发
* 在不重新设计产品的情况下替换单个库（library）
* 独立的编辑器（editor）、解析器（parser）、阅读器（reader）、搜索（search）和 AI 模块（modules）
* 增量开发
* 前端（frontend）展示与后端（backend）系统操作之间有清晰边界

⸻

3. 初始技术栈

3.1 桌面框架（Desktop Framework）

计划使用的框架（framework）：

Tauri

Tauri 提供原生桌面应用外壳（shell），以及前端（frontend）与 Rust 后端（backend）之间的通信。

3.2 前端（Frontend）

计划使用的前端（frontend）：

React
TypeScript

前端（frontend）负责：

* 页面渲染
* 编辑器界面（editor interface）
* 阅读器界面（reader interface）
* 搜索界面（search interface）
* Course 和 Week 导航
* 用户交互
* 本地应用状态
* 调用 Tauri 后端命令（backend commands）

3.3 后端（Backend）

计划使用的后端（backend）：

Rust

Rust 后端（backend）负责不应只在浏览器环境中实现的操作，包括：

* 数据库访问（Database access）
* 文件系统访问（File-system access）
* 导入管理（Import management）
* 源文件存储（Source-file storage）
* 搜索索引协调（Search indexing coordination）
* 解析器进程协调（Parser-process coordination）
* 导出协调（Export coordination）
* 在适用时安全存储 provider 凭证（provider credentials）

3.4 数据库（Database）

计划使用的数据库（database）：

SQLite

SQLite 存储结构化的本地应用数据。

可能的用途包括：

* 课程（Courses）
* 周次（Weeks）
* 学习文档（Learning documents）
* 来源资源元数据（Source-resource metadata）
* 文档块（Document blocks）或序列化后的编辑器内容（editor content）
* 搜索索引（Search indexes）
* 应用设置（Application settings）
* 辅助记录（Assistance records）

最终 schema 必须在数据库（database）实现前单独明确。

3.5 解析器（Parser）

计划的解析器（parser）方向：

基于 Python 的文档解析器（Python-based document parser）

Docling 是候选方案，但尚未成为永久依赖（dependency）。

解析器（parser）必须隔离在解析器接口（parser interface）后面，以便后续替换。

潜在的解析器实现（parser implementations）包括：

* Docling
* Marker
* 自定义 PDF 文本提取（Custom PDF text extraction）
* 其他文档处理服务（document-processing services）

解析器（parser）应将源文件（source files）转换为应用定义的中间文档格式（intermediate document format）。

3.6 搜索（Search）

初始搜索（search）方向：

SQLite FTS5

搜索（Search）应在搜索服务接口（search service interface）后实现。

实现必须支持按课程（course）范围的全文搜索（full-text search）和结果导航。

3.7 编辑器（Editor）

尚未选择编辑器库（editor library）。

候选方案包括：

* Tiptap
* Lexical
* 基于 ProseMirror 的实现（ProseMirror-based implementation）
* 其他可扩展富文本编辑器（rich-text editor）

选定的编辑器（editor）必须支持：

* 结构化块内容（block content）
* 自定义代码块（Custom code blocks）
* 语法高亮（Syntax highlighting）
* 图片（Images）
* 表格（Tables）
* 标题（Headings）
* 文本格式（Text formatting）
* 稳定序列化（serialization）
* 以编程方式导航到搜索结果（search results）

编辑器（editor）选择应通过小型原型（prototype）完成，而不是基于假设。

3.8 PDF 阅读器（PDF Reader）

尚未选择 PDF 阅读器实现（PDF reader implementation）。

一个可能的候选方案是：

PDF.js

阅读器（reader）必须保持只读（read-only），并支持：

* 渲染（Rendering）
* 滚动（Scrolling）
* 缩放（Zoom）
* 在可用时进行文本选择（text selection）
* 页面导航（Page navigation）
* 兼容截图的显示（Screenshot-compatible display）

3.9 语法高亮（Syntax Highlighting）

尚未选择语法高亮库（syntax-highlighting library）。

可能的候选方案包括：

* Shiki
* Prism
* Highlight.js
* CodeMirror 语言包（CodeMirror language packages）

库（library）应根据编辑器兼容性（editor compatibility）和桌面性能（desktop performance）选择。

⸻

4. 顶层仓库（Repository）结构

StudySpace/
├── src/
├── src-tauri/
├── docs/
├── public/
├── resources/
├── scripts/
├── tests/
├── package.json
├── Cargo.toml
├── README.md
└── .gitignore

4.1 src/

包含 React 和 TypeScript 前端（frontend）。

4.2 src-tauri/

包含 Tauri 和 Rust 后端（backend）。

4.3 docs/

包含产品和工程文档。

初始文档：

docs/
├── PROJECT_SPEC.md
├── ARCHITECTURE.md
├── DATABASE.md
├── ROADMAP.md
├── TODO.md
└── CHANGELOG.md

4.4 public/

包含构建（build）期间应直接复制的前端静态文件（frontend static files）。

4.5 resources/

包含开发和应用资源，例如：

* 测试 PDF（Test PDFs）
* 示例课程文件（Sample course files）
* 应用图标（Application icons）
* 在适用时的解析器模型（parser models）或配置（configuration）
* 导出模板（Export templates）

用户学习数据不得存储在仓库（repository）的开发资源目录中。

4.6 scripts/

包含开发脚本，例如：

* 环境设置（Environment setup）
* 解析器安装（Parser installation）
* 开发数据库重置（Development database reset）
* 测试数据生成（Test-data generation）
* 构建辅助脚本（Build helpers）

4.7 tests/

包含项目级集成测试（integration tests）和端到端测试（end-to-end tests）。

模块专属测试（module-specific tests）也可以保留在对应源文件（source files）附近。

⸻

5. 前端模块（Frontend Module）边界

初始前端（frontend）可以使用以下一级结构：

src/
├── app/
├── pages/
├── components/
├── course/
├── week/
├── document/
├── editor/
├── reader/
├── parser/
├── search/
├── assistance/
├── ai/
├── settings/
├── services/
├── hooks/
├── state/
├── types/
├── utils/
├── assets/
└── styles/

这是一级模块（module）规划。

只有当某个模块（module）变得足够大时，才应引入内部文件夹结构（folder structure）。

5.1 app/

负责：

* 应用初始化（Application initialization）
* 路由（Routing）
* 全局 providers（Global providers）
* 错误边界（Error boundaries）
* 窗口级快捷键注册（Window-level shortcut registration）
* 应用外壳（Application shell）

5.2 pages/

包含页面级组合（page-level compositions）。

初始页面：

* Home
* Course
* Import
* Study
* Settings

页面（Pages）应组合功能模块（feature modules），而不是直接包含全部业务逻辑（business logic）。

5.3 components/

包含真正可复用的界面组件（interface components）。

示例可能包括：

* Button
* Dialog
* Sidebar
* 空状态（Empty state）
* Toolbar
* 搜索输入框（Search input）
* 课程卡片（Course card）

功能专属组件（feature-specific components）应保留在对应功能模块（feature modules）内。

5.4 course/

负责前端（frontend）课程（course）操作，包括：

* 课程列表（Course list）
* 创建课程（Course creation）
* 编辑课程（Course editing）
* 删除课程（Course deletion）
* 课程导航（Course navigation）

5.5 week/

负责前端（frontend）周次（Week）操作，包括：

* 周次列表（Week list）
* 创建周次（Week creation）
* 删除周次（Week deletion）
* 周次状态（Week status）
* 周次导航（Week navigation）

5.6 document/

负责学习文档领域（learning-document domain）。

潜在职责包括：

* 加载（Loading）
* 保存（Saving）
* 序列化（Serialization）
* 导出请求（Export requests）
* 文档元数据（Document metadata）
* 块标识（Block identity）
* 文档生命周期（Document lifecycle）

document module 表示学习文档（learning document）本身。

5.7 editor/

负责编辑交互。

潜在职责包括：

* 富文本编辑器集成（Rich-text editor integration）
* 编辑器扩展（Editor extensions）
* 代码块（Code blocks）
* 图片（Images）
* 表格（Tables）
* 文本格式（Text formatting）
* 选择工具栏（Selection toolbar）
* 插入菜单（Insert menu）
* 编辑器命令（Editor commands）
* 文档内搜索结果导航（search-result navigation）

editor module 不得直接拥有数据库持久化（database persistence）。

5.8 reader/

负责来源资源（source-resource）展示。

潜在职责包括：

* PDF 渲染（PDF rendering）
* 页面导航（Page navigation）
* Zoom
* 文本选择（Text selection）
* 源文件切换（Source-file switching）

reader 必须保持只读（read-only）。

5.9 parser/

包含面向前端的解析器接口（frontend-facing parser interfaces）和导入进度（import-progress）展示。

实际解析（parsing）可以运行在 Python 或 Rust 后端（backend）中。

前端 parser module 不应直接依赖某个解析器库（parser library）。

5.10 search/

负责：

* 搜索浮层（Search overlay）
* 查询输入（Query input）
* 搜索结果渲染（Search-result rendering）
* 键盘交互（Keyboard interaction）
* 结果导航（Result navigation）
* 匹配高亮（Match highlighting）

5.11 assistance/

负责非 AI 和 AI 辅助学习提示（AI-assisted learning prompts），例如：

* 重复主题提醒（Duplicate-topic reminders）
* 相似内容提醒（Similar-content reminders）
* 可能放置位置建议（Possible-placement suggestions）
* 已关闭建议状态（Dismissed-suggestion state）

此模块（module）不得静默修改学习文档（learning documents）。

5.12 ai/

负责可选的前端（frontend）AI 交互。

潜在职责包括：

* Provider 选择（Provider selection）
* 用户 prompt 界面（User prompt interface）
* 结果审阅（Result review）
* 确认后插入编辑器（Confirmed insertion into the editor）

AI 输出（AI output）应通过 document 或 editor command interfaces 插入。

5.13 settings/

负责：

* 应用偏好（Application preferences）
* 快捷键偏好（Shortcut preferences）
* 存储偏好（Storage preferences）
* 导入偏好（Import preferences）
* 辅助偏好（Assistance preferences）
* AI provider 设置（AI provider settings）

5.14 services/

包含用于调用 Tauri 后端命令（backend commands）的前端适配器（frontend adapters）。

Services 应暴露类型化应用操作（typed application operations），而不是在整个界面（interface）中直接使用原始命令调用（raw command calls）。

5.15 hooks/

包含可复用的 React hooks。

功能专属 hooks（feature-specific hooks）应保留在对应功能模块（feature module）内，除非被广泛复用。

5.16 state/

包含无法保留在单个页面或功能（feature）本地的共享前端状态（frontend state）。

尚未选择状态管理库（state-management library）。

应尽量减少全局状态（global state）。

持久化数据应保留在后端（backend）和数据库（database）中，而不是只存在前端内存（frontend memory）中。

5.17 types/

包含共享 TypeScript 类型（types）。

在可行时，领域专属类型（domain-specific types）应保留在各自模块（modules）中。

5.18 utils/

包含小型通用工具（general-purpose utilities）。

业务逻辑（Business logic）不应放入通用工具文件（generic utility files）。

5.19 assets/

包含由前端（frontend）管理的图片（images）、图标（icons）和其他导入资源（imported assets）。

5.20 styles/

包含全局样式 token（global style tokens）和全局应用样式（global application styles）。

详细 UI design 暂缓，但开发过程中必须维持基本布局（layout）和可读性（readability）。

⸻

6. 后端模块（Backend Module）边界

详细的 Rust 目录结构（directory structure）应在后端（backend）初始化期间创建。

预期后端（backend）职责包括以下模块（modules）：

src-tauri/
└── src/
    ├── commands/
    ├── database/
    ├── courses/
    ├── weeks/
    ├── documents/
    ├── resources/
    ├── imports/
    ├── parser/
    ├── search/
    ├── export/
    ├── settings/
    ├── ai/
    ├── errors/
    └── main.rs

这是计划结构，可以根据 Rust 模块约定（module conventions）调整。

6.1 commands/

定义暴露给前端（frontend）的 Tauri commands。

Commands 应验证输入，并将工作委托给领域服务（domain services）。

它们不应直接包含全部业务逻辑（business logic）。

6.2 database/

负责：

* SQLite 连接管理（SQLite connection management）
* Schema 迁移（Schema migrations）
* 事务（Transactions）
* Repository 初始化（Repository initialization）
* 数据库错误处理（Database error handling）

6.3 courses/

负责课程领域操作（course-domain operations）。

6.4 weeks/

负责周次领域操作（Week-domain operations）。

6.5 documents/

负责：

* 学习文档持久化（Learning-document persistence）
* 后续需要时的文档版本（document versions）
* 序列化存储（Serialization storage）
* 文档元数据（Document metadata）

6.6 resources/

负责来源资源元数据（source-resource metadata）和本地文件路径（local file paths）。

6.7 imports/

负责来源导入工作流（source-import workflow）。

这包括：

* 接收文件（Accepting files）
* 复制或注册本地来源资源（local source resources）
* 启动解析器操作（Starting parser operations）
* 跟踪导入状态（Tracking import status）
* 创建初始学习文档（Creating initial learning documents）

6.8 parser/

负责与选定的解析器实现（parser implementation）通信。

后端（backend）的其余部分应依赖 parser interface，而不是某个具体解析器库（specific parser library）。

6.9 search/

负责：

* 搜索索引（Search indexing）
* 搜索查询（Search queries）
* 课程范围限定（Course scoping）
* 匹配元数据（Match metadata）
* 文档变化后的重新索引（Reindexing after document changes）

6.10 export/

负责生成导出文件（export files）。

计划的导出目标（export targets）：

* Markdown
* DOCX
* PDF

6.11 settings/

负责持久化应用设置（application settings）。

6.12 ai/

负责可选的 provider 通信（provider communication）和凭证处理（credential handling）。

当未配置 AI 时，此模块（module）应从核心文档工作流（core document workflow）中缺席。

6.13 errors/

包含共享后端错误类型（backend error types），并转换为前端安全错误响应（frontend-safe error responses）。

⸻

7. 领域模型（Domain Model）方向

详细 schema 属于 DATABASE.md。

当前概念实体（conceptual entities）为：

Course
Week
LearningDocument
SourceResource
ImportJob
ApplicationSetting
AssistanceSuggestion

潜在未来实体（entities）包括：

Question
TopicReference
AIProviderConfiguration
ExportRecord

产品当前假设：

Course
  └── Week
        ├── LearningDocument
        └── SourceResources

每个 Week 有一个主学习文档（primary learning document）。

一个 Week 可以有多个来源资源（source resources）。

⸻

8. 数据流（Data Flow）

8.1 导入流程（Import Flow）

用户选择源文件（source file）
        ↓
前端导入界面（Frontend import interface）
        ↓
Tauri 导入命令（Tauri import command）
        ↓
本地来源资源注册（Local source-resource registration）
        ↓
解析器适配器（Parser adapter）
        ↓
中间解析文档（Intermediate parsed document）
        ↓
初始学习文档转换（Initial learning-document conversion）
        ↓
SQLite 持久化（SQLite persistence）
        ↓
编辑器（Editor）打开生成的文档（document）

8.2 编辑流程（Editing Flow）

用户编辑文档（document）
        ↓
编辑器状态变化（Editor state changes）
        ↓
文档序列化（Document serialization）
        ↓
防抖自动保存请求（Debounced autosave request）
        ↓
Tauri 文档命令（Tauri document command）
        ↓
SQLite 持久化（SQLite persistence）
        ↓
搜索索引更新（Search index update）

手动保存应使用相同的持久化路径（persistence path），但不使用防抖（debounce）。

8.3 搜索流程（Search Flow）

Command + F
        ↓
搜索浮层（Search overlay）
        ↓
带类型的搜索请求（Typed search request）
        ↓
Tauri 搜索命令（Tauri search command）
        ↓
SQLite FTS 查询（SQLite FTS query）
        ↓
按课程分组的结果（Grouped course results）
        ↓
打开 Week 和文档（Open Week and document）
        ↓
导航到块或文本范围（Navigate to block or text range）

8.4 辅助流程（Assistance Flow）

文档（Document）或导入内容（import content）变化
        ↓
辅助分析（Assistance analysis）
        ↓
建议记录（Suggestion record）
        ↓
非阻塞用户通知（Non-blocking user notification）
        ↓
用户检查建议（suggestion）
        ↓
用户确认、关闭（dismiss）或忽略（ignore）

确认前不会发生文档变化（document change）。

8.5 AI 流程（AI Flow）

用户选择内容（content）
        ↓
用户明确请求 AI 辅助（AI assistance）
        ↓
Provider 适配器（Provider adapter）
        ↓
生成草稿（Generated draft）
        ↓
用户审阅（User review）
        ↓
确认插入（Confirmed insertion）
        ↓
普通可编辑文档内容（Normal editable document content）

⸻

9. 中间解析文档（Intermediate Parsed Document）

解析器（parser）不得直接写入编辑器库专属结构（editor-library-specific structures）。

应定义一个中立的中间格式（intermediate format）。

潜在块类型（block types）包括：

标题（Heading）
段落（Paragraph）
列表（List）
图片（Image）
表格（Table）
代码（Code）
引用（Quote）
分隔线（Divider）
未知类型（Unknown）

每个解析块（parsed block）可以包含：

* 稳定的临时标识符（Stable temporary identifier）
* 块类型（Block type）
* 文本内容（Text content）
* 来源页引用（Source-page reference）
* 在可用时的来源边界信息（source bounding information）
* 子块（Child blocks）
* 置信度（Confidence）或提取元数据（extraction metadata）
* 图片资源引用（Image-resource reference）

转换层（conversion layer）应将中立解析格式（parsed format）转换为选定编辑器（editor）的文档格式（document format）。

这可以防止解析器（parser）依赖 Tiptap、Lexical 或其他编辑器（editor）。

⸻

10. 学习文档存储（Learning Document Storage）

最终存储格式（storage format）尚未选择。

可能的方案包括：

* 编辑器 JSON 文档（Editor JSON document）
* 应用定义的块 JSON（Application-defined block JSON）
* 块存储与编辑器序列化混合方案（Hybrid block storage and editor serialization）

选定的格式（format）必须支持：

* 稳定块标识符（Stable block identifiers）
* 完整编辑器重建（Full editor reconstruction）
* 搜索索引（Search indexing）
* 导出（Export）
* 编辑器（editor）演进时的迁移（migration）
* 程序化插入（Programmatic insertion）
* 导航到搜索结果（Navigation to search results）

第一个原型（prototype）应评估编辑器原生 JSON（editor-native JSON）是否足够稳定。

Plain HTML 不应被自动假定为主要事实来源（primary source of truth）。

⸻

11. 本地文件存储（Local File Storage）

应用应使用由应用控制的本地数据目录（application-controlled local data directory）。

潜在内容包括：

StudySpaceData/
├── database/
├── sources/
├── images/
├── exports/
├── cache/
└── logs/

确切的操作系统路径（operating-system paths）应使用 Tauri 的标准应用数据 API（standard application-data APIs）。

来源资源（source resources）应通过应用管理的标识符（application-managed identifiers）引用，而不是在整个前端（frontend）中使用硬编码绝对路径（hard-coded absolute paths）。

应用应定义它是否：

* 将导入文件（imported files）复制到托管存储（managed storage）
* 引用原始位置（original location）中的文件
* 同时支持两种模式

初始实现应优先保证可靠访问，并避免失效引用（broken references）。

此选择必须在实现来源资源持久化（source-resource persistence）前最终确定。

⸻

12. Frontend 与 Backend 之间的 API 边界（API Boundary）

前端组件（Frontend components）不应调用任意文件系统或数据库操作（filesystem or database operations）。

前端（frontend）应调用类型化应用命令（typed application commands）。

概念性操作示例：

create_course
list_courses
update_course
delete_course
create_week
list_weeks
update_week
delete_week
import_resource
get_import_status
open_source_resource
load_document
save_document
finish_organizing
search_course
export_document

具体命令名（command names）和载荷（payloads）应在实现前记录。

⸻

13. 键盘快捷键（Keyboard Shortcuts）

快捷键处理（Shortcut handling）应集中管理。

初始计划快捷键（shortcuts）包括：

Command/Ctrl + F    打开课程搜索（course search）
Command/Ctrl + S    保存当前学习文档（learning document）
Escape              关闭当前活动浮层或对话框（active overlay or dialog）

未来快捷键（shortcuts）可能包括：

Command/Ctrl + P    快速导航（Quick navigation）

快捷键（Shortcuts）不得与必需的编辑器行为（editor behavior）冲突，除非经过明确处理。

⸻

14. 安全与隐私（Security and Privacy）

14.1 本地数据（Local Data）

除非用户明确调用在线服务（online service），否则本地学习数据不应离开设备。

14.2 AI 请求（AI Requests）

使用 AI 时，界面（interface）应清楚显示哪些选中内容（content）会发送给 provider。

14.3 凭证（Credentials）

API keys 不得存储在前端源代码（frontend source code）或普通文档内容（document content）中。

凭证存储（Credential storage）应尽可能使用合适的安全本地机制（secure local mechanism）。

14.4 源文件（Source Files）

原始文件（Original files）不得被修改。

应用应将文件系统访问（filesystem access）限制在所需路径和用户选择的资源（resources）内。

⸻

15. 错误处理（Error Handling）

后端错误（Backend errors）应转换为结构化错误响应（structured error responses）。

错误（Errors）应包括：

* 稳定错误类别（Stable error category）
* 用户可读消息（User-readable message）
* 用于日志的可选技术细节（Optional technical details for logs）
* 在适用时的可恢复性信息（recoverability information）

界面（interface）应区分：

* 校验错误（Validation errors）
* 文件访问错误（File-access errors）
* 解析器失败（Parser failures）
* 数据库失败（Database failures）
* 搜索索引失败（Search-index failures）
* 导出失败（Export failures）
* AI provider 失败（AI-provider failures）

解析器（Parser）或 AI 失败（AI failures）不得破坏现有学习文档（learning documents）。

⸻

16. 测试方向（Testing Direction）

16.1 单元测试（Unit Tests）

单元测试（Unit tests）应覆盖：

* 领域校验（Domain validation）
* 序列化转换（Serialization conversion）
* 解析器转换（Parser conversion）
* 搜索结果映射（Search-result mapping）
* 辅助检测（Assistance detection）
* 导出转换（Export conversion）

16.2 集成测试（Integration Tests）

集成测试（Integration tests）应覆盖：

* SQLite repositories（SQLite repository 层）
* Tauri 命令边界（Tauri command boundaries）
* 导入工作流（Import workflow）
* 自动保存工作流（Autosave workflow）
* 搜索索引（Search indexing）
* 来源资源访问（Source-resource access）

16.3 端到端测试（End-to-End Tests）

核心端到端工作流（end-to-end workflow）应覆盖：

1. 创建课程（course）。
2. 创建 Week。
3. 导入 PDF（Import PDF）。
4. 生成文档（document）。
5. 编辑文档（document）。
6. 保存文档（document）。
7. 完成整理（Finish organizing）。
8. 重新打开 Study Mode。
9. 搜索已编辑内容（edited content）。

⸻

17. 开发顺序（Development Sequence）

推荐实现顺序为：

1. 初始化 React、TypeScript、Tauri 和 Rust。
2. 确认应用在开发环境和生产构建（development and production builds）中都能启动。
3. 创建初始仓库结构（repository structure）。
4. 定义数据库 schema（database schema）。
5. 实现数据库迁移（database migrations）。
6. 实现 Course CRUD。
7. 实现 Week CRUD。
8. 实现一个最小纯文本学习文档（plain-text learning document）。
9. 实现文档加载、保存和自动保存（document loading, saving and autosaving）。
10. 实现 PDF 导入（PDF importing）和来源资源存储（source-resource storage）。
11. 实现只读 PDF reader（read-only PDF reader）。
12. 实现解析器适配器（parser adapter）和基础文本提取（text extraction）。
13. 生成初始学习文档（initial learning document）。
14. 制作原型（Prototype）并选择富文本编辑器（rich-text editor）。
15. 用选定的富文本编辑器（rich-text editor）替换纯文本编辑器（plain-text editor）。
16. 实现代码块（code blocks）和语法高亮（syntax highlighting）。
17. 实现课程范围搜索（course-wide search）。
18. 实现 Import Mode 布局（layout）。
19. 实现 Study Mode 布局（layout）。
20. 实现基础辅助提醒（assistance reminders）。
21. 实现导出（export）。
22. 优化界面设计（interface design）。
23. 添加可选 AI provider 支持（AI provider support）。

每完成一个阶段后，应用都应保持可运行（runnable）。

⸻

18. 仍需决定的事项

以下决策不应被静默假定：

* 最终应用名称（application name）
* 富文本编辑器库（Rich-text editor library）
* 语法高亮库（Syntax-highlighting library）
* 解析器实现（Parser implementation）
* 源文件复制或引用策略（Source-file copy versus reference policy）
* 学习文档存储格式（Learning-document storage format）
* 前端状态管理库（Frontend state-management library）
* Rust SQLite 库（Rust SQLite library）
* 迁移框架（Migration framework）
* DOCX 导出实现（DOCX export implementation）
* PDF 导出实现（PDF export implementation）
* 安全凭证存储实现（Secure credential storage implementation）
* 将 Python parser 与 Tauri 打包的方式

每项决策都应单独评估，并记录在本文档或架构决策记录（architecture decision record）中。

⸻

19. 架构决策记录（Architecture Decision Records）

重要技术决策最终应记录在：

docs/decisions/

示例文件：

0001-editor-library.md
0002-document-storage-format.md
0003-parser-integration.md
0004-source-file-storage.md

每条决策记录（decision record）应说明：

* 背景（Context）
* 考虑过的选项（Options considered）
* 决策（Decision）
* 原因（Reasons）
* 后果（Consequences）

这在初始项目设置（project setup）前不是必需的，但在做出昂贵或难以逆转的选择前应使用。
