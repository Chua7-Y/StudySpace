import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type DatabaseHealth = {
  ok: boolean;
  schemaVersion: number;
  databasePath?: string;
};

type DatabaseStatus =
  | { state: "checking" }
  | { state: "ready"; schemaVersion: number }
  | { state: "error" };

export function HomePage() {
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    state: "checking",
  });

  useEffect(() => {
    let isMounted = true;

    invoke<DatabaseHealth>("database_health_check")
      .then((health) => {
        if (!isMounted) {
          return;
        }

        if (health.ok) {
          setDatabaseStatus({
            state: "ready",
            schemaVersion: health.schemaVersion,
          });
        } else {
          setDatabaseStatus({ state: "error" });
        }
      })
      .catch(() => {
        if (isMounted) {
          setDatabaseStatus({ state: "error" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="home-page">
      <h1>StudySpace</h1>
      <p>本地优先的学习工作区</p>
      <p className="database-status">
        {databaseStatus.state === "checking" && "数据库：检查中"}
        {databaseStatus.state === "ready" &&
          `数据库：已就绪 · Schema 版本：${databaseStatus.schemaVersion}`}
        {databaseStatus.state === "error" && "数据库：错误"}
      </p>
    </main>
  );
}
