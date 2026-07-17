StudySpace 产品规格

1. 产品概览

StudySpace 是一个本地优先（local-first）的桌面学习应用。

它的目标是帮助用户将课程材料转化为长期使用的个人学习文档（learning documents）。

核心产品是由用户创建和维护的学习文档（learning document）。

StudySpace 不是：

* PDF 批注应用（PDF annotation application）
* 通用笔记应用（note-taking application）
* AI 聊天应用（AI chat application）
* 知识图谱应用（knowledge graph application）
* Obsidian 替代品（Obsidian replacement）
* 完全自动的学习内容整理器（learning-content organizer）

AI 和自动辅助（automated assistance）是可选能力。它们不能成为产品中心。

⸻

2. 核心产品原则

2.1 本地优先（Local First）

用户数据默认必须存储在本地。

核心工作流（workflow）必须在没有网络连接（internet connection）的情况下仍然可用。

可以为可选功能添加网络服务（network services），但本地学习文档（learning documents）不得依赖它们。

2.2 学习文档（Learning Document）是核心产物（artifact）

学习文档（learning document）不是附着在原始材料上的独立批注层（annotation layer）。

学习文档（learning document）是用户真正长期使用的学习文档。

导入源材料（source material）后，用户可以：

* 重写标题（headings）
* 删除内容
* 重新排序内容
* 合并章节（sections）
* 拆分章节（sections）
* 添加个人解释
* 添加教程材料（tutorial material）
* 添加答案（solutions）
* 添加图片（images）
* 添加代码（code）
* 确认后插入 AI 生成解释（AI-generated explanations）
* 完全替换导入内容

应用不得将原始结构保留为强制编辑约束。

2.3 原始文件（Original Files）是来源（Sources）

原始文件（original files）是可信的来源引用（source references）。

它们用于导入（importing）、对比（comparison）和验证（verification）。

原始文件（original files）不得成为主要的长期工作区（workspace）。

应用不得修改原始文件（original files）。

2.4 用户做最终决定

应用可以检测潜在问题并提供辅助（assistance）。

它不得在没有用户确认的情况下自动修改学习文档（learning documents）。

运行原则是：

应用观察并提出建议。用户决定。

2.5 辅助能力（Assistance）必须支持经验较少的学习者

产品不得假设每个用户都能独立识别重复、缺失或组织不佳的内容。

辅助能力（Assistance）应帮助用户注意潜在问题，同时避免过度打扰。

辅助流程通常应遵循以下顺序：

1. 检测（Detect）
2. 通知（Notify）
3. 允许用户检查（inspect）
4. 提供可执行操作（Offer an action）
5. 仅在确认（confirmation）后执行操作（apply the action）

2.6 简洁清爽的界面（Interface）

界面（interface）应在视觉上简单、干净且聚焦。

应用应避免永久显示包含大量控件（controls）的工具栏（toolbars）。

编辑体验应只提供学习文档（learning documents）所需的工具。

⸻

3. 核心内容模型

3.1 课程（Course）

课程（Course）是最高层级的学习容器。

示例：

* INFO5995
* COMP5310
* COMP5318

一个课程（Course）包含多个按周组织的学习文档（weekly learning documents）。

3.2 周次（Week）

周次（Week）表示课程组织中的一个主要单元。

当前产品模型是：

一个周次（Week）对应一个学习文档（learning document）。

一个周次（Week）可以包含来自以下来源的内容：

* 课堂幻灯片（lecture slides）
* 教程材料（tutorial materials）
* 教程答案（tutorial solutions）
* 阅读材料（readings）
* 个人解释（personal explanations）
* 图片和截图（images and screenshots）
* 代码示例（code examples）
* AI 辅助解释（AI-assisted explanations）

课堂内容（lecture content）提供主要组织框架。

教程和答案内容（tutorial and solution content）应补充相关课堂主题（lecture topics），而不是永久分离成无关文档。

3.3 学习文档（Learning Document）

每个周次（Week）有一个主学习文档（primary learning document）。

学习文档（learning document）可自由编辑，并完全属于用户。

学习文档（learning document）可以包含：

* 标题（headings）
* 段落（paragraphs）
* 列表（lists）
* 图片（images）
* 代码块（code blocks）
* 表格（tables）
* 引用（quotes）
* 分隔线（dividers）
* 链接（links）
* 高亮（highlights）
* 用户创建的解释（user-created explanations）
* 导入的源内容（imported source content）

3.4 来源资源（Source Resource）

来源资源（source resource）是原始导入文件。

示例：

* PDF
* PPT 或 PPTX
* DOCX
* 图片（Image）

来源资源（source resources）保持不变。

当用户想验证原始材料时，可以打开它们。

⸻

4. 主要用户工作流（Workflow）

主要工作流（workflow）是：

1. 打开 StudySpace。
2. 选择或创建课程（course）。
3. 选择或创建 Week。
4. 导入源材料（source materials）。
5. 查看原始材料（original material）。
6. 从导入材料（imported material）生成初始学习文档（initial learning document）。
7. 编辑并重新组织学习文档（learning document）。
8. 完成初始整理流程（initial organization process）。
9. 在 Study Mode 中继续使用学习文档（learning document）。
10. 在需要时搜索、更新和导出文档（document）。

一般生命周期（lifecycle）是：

原始材料（Original Material）
        ↓
导入和解析（Import and Parse）
        ↓
初始学习文档（Initial Learning Document）
        ↓
用户整理（User Organization）
        ↓
长期学习文档（Long-Term Learning Document）

导入后，原始材料（original material）和学习文档（learning document）不需要保持同步。

⸻

5. 页面（Pages）

5.1 主页（Home Page）

主页（Home Page）是应用的起始页面。

它的主要用途是课程管理（course management）。

它应展示：

* 应用身份标识（application identity）
* 课程列表（course list）
* 最近访问的课程信息（recently accessed course information）
* 继续学习入口（continue-learning entry points）
* 创建课程操作（create-course action）
* 设置入口（settings entry）

课程卡片（course card）可以展示：

* 课程名称（course name）
* 最近访问的周次（most recently accessed Week）
* 上次学习时间（last learning time）
* 整理状态摘要（organization status summary）

主页（Home Page）不应被设计成原始文件管理器（file manager）。

5.2 课程页（Course Page）

课程页（Course Page）展示选中的课程（course）及其周次（Weeks）。

它应提供：

* 课程名称（course name）
* 周次列表（Week list）
* 创建周次（Create Week）
* 打开周次（Open Week）
* 导入入口（import entry）
* 课程设置（course settings）
* 未来题库入口（future question-bank entry）

每个 Week 应显示其基本状态，例如：

* 未整理（Not organized）
* 已整理（Organized）

选择已整理的周次（organized Week）会打开 Study Mode。

选择没有已完成学习文档（learning document）的周次（Week）会打开 Import Mode。

5.3 导入页（Import Page）

Import Mode 用于将源材料（source material）转换为学习文档（learning document）。

主 layout 包含三个区域：

当前文件目录（Current File Directory） | 原始文件阅读器（Original File Reader） | 学习文档编辑器（Learning Document Editor）

左侧区域：当前文件目录（Current File Directory）

左侧区域显示当前导入来源（imported source）的结构。

它可以显示：

* 文件名（file name）
* 页面结构（page structure）
* 提取出的标题（extracted headings）
* 当前来源位置（current source position）

此目录（directory）用于导入（importing）期间的导航。

中间区域：原始文件阅读器（Original File Reader）

中间区域显示原始来源（original source）。

它允许的职责是：

* 阅读（reading）
* 滚动（scrolling）
* 缩放（zooming）
* 在可行时复制文本（text）
* 支持截图（screenshots）

它不得提供：

* 源文件编辑（source-file editing）
* 永久批注（permanent annotations）
* 直接附着到来源（source）的笔记（notes）
* 将来源高亮（source highlighting）作为主要学习工作流（learning workflow）

右侧区域：学习文档编辑器（Learning Document Editor）

右侧区域包含可编辑的学习文档（learning document）。

解析器（parser）应在可行时生成初始文档（initial document）。

随后用户决定要：

* 保留（Keep）
* 删除（Delete）
* 重写（Rewrite）
* 重新排序（Reorder）
* 合并（Merge）
* 补充（Supplement）

不应要求用户手动转移每一个段落（paragraph）。

Import Mode 应提供清晰的完成动作，例如：

完成整理（Finish Organizing）

完成初始整理（initial organization）后，周次（Week）的状态变为已整理（organized），并打开 Study Mode。

5.4 学习页（Study Page）

Study Mode 是正常的长期工作区（workspace）。

它的主布局（layout）包含：

课程目录（Course Directory） | 学习文档（Learning Document）

原始文件（original file）不会永久显示。

用户可以通过次级动作打开它，例如：

查看原文（View Original）

主工作区（workspace）仍聚焦于学习文档（learning document）。

5.5 设置页（Settings Page）

设置页（Settings Page）管理应用级偏好（application-level preferences）。

潜在 settings 包括：

* 外观（appearance）
* 存储位置（storage location）
* 导入行为（import behavior）
* 键盘快捷键（keyboard shortcuts）
* AI provider 配置（AI provider configuration）
* 辅助偏好（assistance preferences）
* 导出偏好（export preferences）

第一版不需要实现每个设置项（setting）。

⸻

6. 编辑器要求（Editor Requirements）

6.1 编辑器定位（Editor Positioning）

编辑器（editor）应感觉像一个简单、连续的文档（document）。

它在视觉上不应像一组卡片（cards）。

它不应试图复刻 Microsoft Word 的完整功能集（feature set）。

它可以使用基于块的内部数据结构（block-based internal data structures），同时呈现自然的文档表面（document surface）。

6.2 支持内容（Supported Content）

计划中的编辑器（editor）应支持：

* 一级标题（Heading level 1）
* 二级标题（Heading level 2）
* 三级标题（Heading level 3）
* 段落（Paragraph）
* 加粗（Bold）
* 下划线（Underline）
* 高亮（Highlight）
* 文字颜色（Text color）
* 项目符号列表（Bullet list）
* 编号列表（Numbered list）
* 图片（Image）
* 代码块（Code block）
* 简单表格（Simple table）
* 引用（Quote）
* 分隔线（Divider）
* 链接（Link）

6.3 不包含的文字处理功能（Excluded Word-Processing Features）

产品当前不需要：

* 字体选择（font-family selection）
* 任意字号（arbitrary font sizes）
* 页边距（page margins）
* 页眉和页脚（headers and footers）
* 分栏（columns）
* 打印版式编辑（print-layout editing）
* 装饰性页面格式（decorative page formatting）

6.4 编辑自由度（Editing Freedom）

所有导入内容（imported content）都必须保持可编辑。

用户可以将原始课堂标题（lecture headings）改成自己的表达。

示例包括：

Authentication

变成：

身份验证（Authentication）

或任何其他用户定义的标题（heading）。

目录（directories）和搜索索引（search indexes）必须在标题（headings）变化时更新。

6.5 编辑控件（Editing Controls）

界面（interface）应避免永久拥挤的工具栏（toolbar）。

推荐的交互模式（interaction patterns）包括：

* 选中文本时出现小型选择工具栏（selection toolbar）
* 用于新块（blocks）的插入控件（insert control）
* 在有用时支持类似 Markdown 的键盘输入（Markdown-like keyboard input）
* 高频操作（actions）的键盘快捷键（keyboard shortcuts）

选择工具栏（selection toolbar）可以包含：

* 加粗（Bold）
* 高亮（Highlight）
* 文字颜色（Text color）
* 链接（Link）
* 搜索（Search）
* AI 辅助（AI assistance）

插入菜单（insert menu）可以包含：

* 文本（Text）
* 标题（Heading）
* 图片（Image）
* 代码块（Code block）
* 表格（Table）
* 引用（Quote）
* 分隔线（Divider）

6.6 代码块（Code Blocks）

代码块（Code blocks）是重要的编辑器能力（editor capability）。

它们应提供类似 Markdown 的体验（Markdown-like experience）和语法高亮（syntax highlighting）。

计划支持的语言（language）包括：

* Python
* Java
* JavaScript 或 TypeScript
* SQL
* R
* Rust

用户应能够选择或更改代码语言（code language）。

编辑器（editor）应以干净、可读的样式（style）显示代码（code），而不是类似 Word 的手动格式（Word-like manual formatting）。

6.7 图片（Images）

用户应能够：

* 插入图片（Insert an image）
* 将图片（image）拖入学习文档（learning document）
* 粘贴截图（Paste a screenshot）
* 调整大小或移除图片（resize or remove an image）

复杂图示（diagrams）和复杂表格（tables）可以作为截图（screenshots）保留。

第一版不需要 OCR 或 AI 图像理解（AI image understanding）。

⸻

7. 搜索（Search）

搜索（Search）是核心产品能力。

7.1 范围（Scope）

搜索（Search）应覆盖当前课程（course）。

它应搜索：

* 周次标题（Week titles）
* 文档标题（document headings）
* 段落内容（paragraph content）
* 用户添加的解释（user-added explanations）
* 教程和答案内容（tutorial and solution content）
* 在可行时搜索代码文本（code text）

7.2 交互（Interaction）

主要快捷键（shortcut）是：

Command + F

在适用时，其他操作系统（operating systems）上应支持等效快捷键（shortcuts）。

搜索（Search）不应需要一个永久可见的大型搜索框（search box）。

激活搜索（search）应打开临时搜索界面（search interface）或浮层（overlay）。

7.3 搜索结果（Search Results）

结果（results）应按周次（Week）或文档位置（document location）分组。

每个结果（result）应显示足够上下文（context），以便识别匹配项。

选择 result 应：

1. 打开正确的 Week。
2. 跳转到匹配位置。
3. 高亮匹配文本（matched text）。

按 Escape 应关闭搜索界面（search interface）。

7.4 未来导航快捷键（Future Navigation Shortcut）

未来可以考虑类似 Command + P 的命令导航功能（command-navigation feature）。

它可以允许用户快速打开周次（Week）或标题（heading）。

第一版不需要此功能。

⸻

8. 辅助能力（Assistance）

8.1 通用规则（General Rule）

辅助能力（Assistance）不得静默更改用户内容。

它应保持可见、可逆且可关闭（dismiss）。

8.2 初始辅助能力（Initial Assistance Capabilities）

潜在辅助能力（assistance）包括：

* 检测重复标题（detecting repeated headings）
* 检测高度相似的段落（detecting highly similar passages）
* 检测已经存在于其他周次（Week）的主题（topics）
* 指出某个来源章节（source section）可能尚未整理（organized）
* 指出教程材料（tutorial material）可能关联到已有主题（topic）

示例：

Cookie 已经出现在 Week 3。

可用的用户操作（actions）可以包括：

* 查看已有内容（View existing content）
* 对比（Compare）
* 手动移动（Move manually）
* 确认后合并（Merge after confirmation）
* 忽略（Ignore）
* 关闭（Dismiss）

8.3 辅助等级（Assistance Levels）

产品可以通过三个辅助等级（assistance levels）演进。

Level 1：提醒（Reminder）

系统识别可能的问题。

Level 2：建议（Suggestion）

系统提出可能的操作（action）。

Level 3：自动化（Automation）

系统在明确许可（permission）后执行操作（action）。

初始版本应优先提醒（reminders）和有限建议（suggestions）。

自动整理（automatic organization）不应默认启用。

⸻

9. AI 辅助（AI Assistance）

AI 是可选的。

应用必须在没有 AI 的情况下仍然有用。

9.1 用户主动触发的交互（User-Initiated Interaction）

AI 只应在用户明确操作（action）后运行。

示例工作流（workflow）：

1. 选择文本（text）。
2. 请求解释（explanation）。
3. 查看生成回复（generated response）。
4. 确认插入（insertion）。
5. 将回复（response）作为普通可编辑文档内容（document content）插入。

9.2 AI 输出（AI Output）

AI 输出（AI output）不得成为学习文档（learning document）内独立、永久的聊天历史（chat history）。

插入后，它会成为普通的用户可编辑内容（user-editable content）。

9.3 Provider 独立性（Provider Independence）

产品在概念上不应依赖单个 AI provider。

未来 provider 可以包括：

* OpenAI
* Anthropic Claude
* Google Gemini
* DeepSeek
* Ollama
* LM Studio

Provider 实现（provider implementation）属于技术架构（technical architecture），而不是产品核心身份。

⸻

10. 保存（Saving）

学习文档（learning documents）应支持自动保存（automatic saving）。

也应提供手动保存快捷键（manual save shortcut）。

预期行为：

* 更改（changes）保存在本地。
* 用户不需要持续管理单独的保存操作（save operations）。
* 可见的保存状态（save state）可以指示更改（changes）是否已保存。

⸻

11. 导出（Export）

计划的导出格式（export formats）包括：

* Markdown
* DOCX
* PDF

Markdown 支持未来编辑。

DOCX 支持分享和常规文档工作流（document workflows）。

PDF 支持阅读、打印和分发。

导出实现（export implementation）可以逐步交付。

⸻

12. 文件更新（File Updates）

第一版不需要在更新后的源文件（updated source files）和现有学习文档（learning documents）之间做自动同步（automatic synchronization）。

对于小的来源变化（source changes），用户可以手动更新学习文档（learning document）。

对于大的来源变化（source changes），用户可以将更新后的来源（updated source）作为新的资源（resource）导入。

自动合并（automatic merging）和来源版本对比（source-version comparison）不在初始范围（initial scope）内。

⸻

13. 学习状态（Learning Status）

第一版不应试图计算用户是否已经掌握某个主题（topic）。

初始状态模型（status model）应保持简单：

* 未整理（Not organized）
* 已整理（Organized）

未来题库功能（question-bank features）可以添加如下状态（states）：

* 已练习（Practiced）
* 做错（Incorrect）
* 已复习（Reviewed）

⸻

14. 未来题库（Future Question Bank）

题库（question bank）是未来扩展，不属于初始实现（initial implementation）。

它可以包含：

* 教程问题（tutorial questions）
* 教程答案（tutorial solutions）
* 历年考试题（past-exam questions）
* 用户创建的问题（user-created questions）
* AI 生成的问题（AI-generated questions）
* 回答错误的问题（incorrectly answered questions）

问题（questions）可以关联一个或多个学习主题（learning topics）。

题库（question bank）应支持学习文档（learning document），而不是替代它。

⸻

15. 初始范围（Initial Scope）

初始版本应聚焦完整核心工作流（core workflow）：

1. 创建课程（course）。
2. 创建 Week。
3. 导入 PDF（Import a PDF）。
4. 阅读原始 PDF（original PDF）。
5. 生成初始学习文档（initial learning document）。
6. 编辑并保存学习文档（learning document）。
7. 完成整理（Finish organizing）。
8. 在 Study Mode 中重新打开 Week。
9. 搜索课程（Search the course）。
10. 导出（Export）或继续编辑（editing）。

第一个可用版本（functional version）不要求以下内容：

* AI 集成（AI integration）
* 题库（question bank）
* 云同步（cloud synchronization）
* 协同编辑（collaborative editing）
* 自动掌握度评估（automatic mastery assessment）
* 高级来源版本合并（advanced source version merging）
* 完整 OCR（full OCR）
* AI 图像理解（AI image understanding）
* 复杂表格重建（complex table reconstruction）
* 移动应用（mobile applications）
