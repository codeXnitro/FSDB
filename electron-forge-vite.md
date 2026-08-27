# Using FSDB with Electron Forge + Vite

This guide shows you how to integrate **FSDB** into an Electron application created with the latest Electron Forge + Vite template (`npx create-electron-app@latest my-app --template=vite-typescript` or `vite`).

---

## 1. Install FSDB

In your Electron project directory:
```bash
npm install fsdb
```

---

## 2. Setup in Main Process (`src/main.ts`)

In your Electron main process, initialize the database inside the user data directory (or any path you prefer) and register the built-in IPC handlers:

```typescript
// src/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { FSDB, registerFSDBIpc } from 'fsdb';

// 1. Initialize FSDB database in app's userData directory
const dbPath = path.join(app.getPath('userData'), 'app-database.json');
const db = new FSDB(dbPath);

// 2. Register all IPC handlers in one line
registerFSDBIpc(ipcMain, db);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load Vite dev server or production build
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

app.whenReady().then(createWindow);
```

---

## 3. Expose to Renderer in Preload (`src/preload.ts`)

```typescript
// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { createFSDBClient } from 'fsdb';

// Expose safe, typed FSDB client to window.fsdb
contextBridge.exposeInMainWorld('fsdb', createFSDBClient(ipcRenderer));
```

---

## 4. Use in Vite Frontend (React / Vue / Svelte / Vanilla JS)

Now anywhere in your frontend code (e.g. React `App.tsx` or Vue `App.vue`), you have full access to `window.fsdb`!

### React Example (`src/renderer/App.tsx`):
```tsx
import React, { useEffect, useState } from 'react';

// Type declaration for window.fsdb
declare global {
  interface Window {
    fsdb: any;
  }
}

export function App() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Load tasks on component mount
  const loadTasks = async () => {
    const list = await window.fsdb.collection('tasks').find({});
    setTasks(list);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await window.fsdb.collection('tasks').insert({
      title: newTaskTitle,
      done: false,
    });
    setNewTaskTitle('');
    loadTasks();
  };

  const handleExport = async () => {
    await window.fsdb.exportToFile('C:/Users/Public/shared-tasks.json', {
      metadata: { author: 'Bob', description: 'Shared sprint tasks' }
    });
    alert('Exported successfully to JSON file!');
  };

  const handleImport = async () => {
    await window.fsdb.importFromFile('C:/Users/Public/shared-tasks.json', { mode: 'merge' });
    loadTasks();
    alert('Imported and merged tasks from JSON file!');
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>My Electron + FSDB App</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task..."
        />
        <button onClick={handleAddTask} style={{ marginLeft: 8 }}>Add Task</button>
      </div>

      <ul>
        {tasks.map((task) => (
          <li key={task._id}>{task.title}</li>
        ))}
      </ul>

      <div style={{ marginTop: 24 }}>
        <button onClick={handleExport}>Share Data (Export JSON)</button>
        <button onClick={handleImport} style={{ marginLeft: 8 }}>Load Shared Data (Import JSON)</button>
      </div>
    </div>
  );
}
```
