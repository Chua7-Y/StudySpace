# StudySpace

Local-first learning workspace.

StudySpace is a desktop learning application built with React, TypeScript, Vite, Tauri, and Rust.

## Development

Install dependencies:

```sh
npm install
```

Start the desktop app in development mode:

```sh
npm run dev
```

Build the desktop app:

```sh
npm run build
```

Run the frontend-only Vite development server:

```sh
npm run vite:dev
```

## Database

StudySpace uses a local SQLite database for application data.

The database is created automatically when the Tauri app starts. The file name is:

```text
studyspace.db
```

The file is stored in the operating system's standard application data directory, resolved through Tauri. It is not stored in the source tree, `resources/`, the current working directory, or `public/`.

On startup, the backend:

1. resolves the application data directory,
2. ensures the directory exists,
3. opens `studyspace.db`,
4. enables SQLite settings such as foreign keys,
5. runs pending migrations,
6. stores the database connection in Tauri managed state.

Run database-related Rust tests:

```sh
cd src-tauri
cargo test database
```

Check the current schema version from the app by running the desktop app and reading the home page database status:

```sh
npm run dev
```

The first schema version is `1`.

## Structure

```text
studyspace/
├── src/                 # Frontend source
├── src-tauri/           # Tauri / Rust backend
├── docs/                # Project docs, notes, architecture records
├── resources/           # Sample files, test PDFs, icons, seed data
├── scripts/             # Development and utility scripts
├── public/              # Static frontend assets
├── package.json
└── .gitignore
```

## Notes

Rust backend files live under `src-tauri/`, including `src-tauri/Cargo.toml`.
