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
