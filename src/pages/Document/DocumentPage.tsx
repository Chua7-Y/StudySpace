import { useLearningDocument } from "../../document/useLearningDocument";

type DocumentPageProps = {
  weekId: string;
  onBack: () => void;
};

export function DocumentPage({ weekId, onBack }: DocumentPageProps) {
  const {
    document,
    content,
    isLoading,
    isSaving,
    saveState,
    loadError,
    saveError,
    loadDocument,
    updateContent,
    save,
  } = useLearningDocument(weekId);

  if (isLoading) {
    return (
      <main className="home-page document-page">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <p className="state-message">正在加载学习文档……</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="home-page document-page">
        <button className="secondary-button" type="button" onClick={onBack}>
          返回
        </button>
        <div className="state-panel" role="alert">
          <h1>学习文档加载失败</h1>
          <p>{loadError}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void loadDocument()}
          >
            重新加载
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="home-page document-page">
      <header className="document-header">
        <div>
          <button className="secondary-button" type="button" onClick={onBack}>
            返回
          </button>
          <h1>{document?.title || "学习文档"}</h1>
        </div>
      </header>

      <section className="document-editor" aria-label="学习文档编辑器">
        <label className="document-textarea-label" htmlFor="document-content">
          文档内容
        </label>
        <textarea
          id="document-content"
          className="document-textarea"
          value={content}
          onChange={(event) => updateContent(event.target.value)}
          placeholder="在这里输入学习内容。"
        />

        <div className="document-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isSaving}
            onClick={() => void save()}
          >
            {isSaving ? "保存中……" : "保存"}
          </button>
          {saveState === "saved" && (
            <span className="document-status" role="status">
              已保存
            </span>
          )}
          {saveError && (
            <span className="form-error document-save-error" role="alert">
              {saveError}
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
