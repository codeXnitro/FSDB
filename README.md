# FSDB ⚡

> **Ultra-fast, crash-safe, single-file JSON database for TypeScript, Node.js, and Electron (Forge + Vite).**  
> Designed to be so dead-simple that a 2-day experienced JavaScript developer can master it in 5 minutes, yet packed with power features for complex desktop apps.

---

## ✨ Features

- 📁 **Single-File Storage**: Entire database (Collections + Key-Value store) is stored in one clean, human-readable `.json` file.
- 🛡️ **Crash-Proof Atomic Writes**: Never corrupts data on power cuts or app crashes (uses safe temporary writes + atomic file replacement with Windows lock retries).
- 🧩 **Dual Storage Models**: Supports both **Key-Value Store** (`db.set()`, `db.get()`) and **Document Collections** (`db.collection('users')`).
- 👥 **User A ➔ User B Data Sharing**: Export and import datasets directly to pure `.json` files with automatic checksum verification and smart merge strategies (`merge`, `overwrite`, `skip_existing`).
- ⚡ **Lightning Fast In-Memory Cache**: Sub-millisecond reads with automatic disk persistence.
- 🔍 **Rich Query Engine**: MongoDB-like query operators (`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$between`, `$contains`, `$startsWith`, `$endsWith`, `$regex`, `$all`, `$size`, `$exists`, `$where`, `$and`, `$or`, `$not`, `$nor`) + **nested dot-notation** (`'profile.address.city'`).
- 🔗 **Fluent Chainable Query Builder**: `.where()`, `.sortBy()`, `.limit()`, `.skip()`, `.paginate()`, `.first()`, `.count()`.
- ⚡ **Reactive Event Emitter**: Listen to `'insert'`, `'update'`, `'delete'`, and `'change'` events in real-time.
- 🔄 **Transactions with Rollback**: Atomic batch operations that automatically revert if an error occurs.
- ⚛️ **Electron Forge (Vite) Ready**: Built-in 1-line IPC handlers and preload client bridge.
- 📦 **Zero Runtime Dependencies**: Ultra-lightweight and compatible with all modern Node and Electron versions.

---

## 📦 Installation

```bash
npm install fsdb
```

---

## 🚀 2-Minute Quickstart

```typescript
import { FSDB } from 'fsdb';

// 1. Initialize or load a single-file database
const db = new FSDB('./my-app.json');

// --- Key-Value Storage ---
db.set('theme', 'dark');
console.log(db.get('theme')); // 'dark'

// --- Document Collections ---
interface User {
  name: string;
  role: 'admin' | 'developer';
  age: number;
  tags: string[];
}

const users = db.collection<User>('users');

// Insert (auto-generates unique _id, createdAt, updatedAt)
users.insert({
  name: 'Alice',
  role: 'admin',
  age: 28,
  tags: ['lead', 'architect'],
});

// Find documents with rich queries
const leadAdmins = users.find({
  role: 'admin',
  age: { $gte: 18 },
  tags: { $contains: 'lead' },
});

console.log(leadAdmins);
```

---

## 👥 Data Sharing Between Users (Pure JSON Export & Import)

Easily share project data from **User A** to **User B** using pure `.json` files.

### 1. User A exports data:
```typescript
db.exportToFile('./alice-shared-data.json', {
  collections: ['projects', 'tasks'], // or omit to export entire DB
  includeKV: true,
  metadata: {
    author: 'Alice',
    description: 'Sprint 1 tasks and project plan',
    version: '1.0.0',
  },
});
```

### 2. User B imports and merges data:
```typescript
const result = db.importFromFile('./alice-shared-data.json', {
  mode: 'merge', // 'merge' (updates existing / adds new) | 'overwrite' | 'skip_existing'
});

console.log(`Imported from ${result.metadata.author}! Added ${result.documentsAdded} docs.`);
```

---

## 🔍 Advanced Queries

### Supported Operators
| Operator | Description | Example |
|---|---|---|
| `$eq` / `$ne` | Equal / Not equal | `{ status: { $ne: 'archived' } }` |
| `$gt` / `$gte` | Greater than / Greater or equal | `{ age: { $gte: 21 } }` |
| `$lt` / `$lte` | Less than / Less or equal | `{ price: { $lt: 100 } }` |
| `$between` | Value between range `[min, max]` | `{ price: { $between: [50, 150] } }` |
| `$in` / `$nin` | In array / Not in array | `{ role: { $in: ['admin', 'manager'] } }` |
| `$contains` | Substring match (case-insensitive) or array item | `{ title: { $contains: 'pro' } }` |
| `$startsWith` / `$endsWith` | String prefix / suffix | `{ name: { $startsWith: 'Al' } }` |
| `$regex` | Regular expression pattern | `{ email: { $regex: /@gmail\.com$/i } }` |
| `$all` | Array contains all specified items | `{ tags: { $all: ['ts', 'node'] } }` |
| `$size` | Array length matches | `{ tags: { $size: 3 } }` |
| `$exists` | Field exists | `{ 'profile.phone': { $exists: true } }` |
| `$and` / `$or` / `$not` / `$nor` | Boolean logical grouping | `{ $or: [{ role: 'admin' }, { age: { $gt: 30 } }] }` |
| `$where` | Custom JS predicate function | `{ $where: (doc) => doc.items.length > 5 }` |

### Deep Nested Dot Notation
```typescript
const matches = users.find({
  'profile.address.country': 'Nepal',
  'settings.notifications.email': true,
});
```

### Fluent Query Builder & Pagination
```typescript
const page = users
  .query()
  .where('age', '>=', 18)
  .where('role', 'admin')
  .sortBy({ age: 'desc' })
  .paginate(1, 10); // page 1, 10 items per page

console.log(page.data); // (User & BaseDocument)[]
console.log(page.totalPages); // e.g. 5
console.log(page.total); // e.g. 48
```

---

## ⚡ Reactive Event Listeners

Perfect for updating UI components or triggering background jobs:

```typescript
// Listen to all database mutations
db.on('change', (event) => {
  console.log('Database changed:', event.type, event.collection, event.ids);
});

// Or listen to collection events
db.on('insert', (event) => {
  console.log('New documents inserted:', event.documents);
});
```

---

## 🔄 Transactions & Rollback

```typescript
await db.transaction((tx) => {
  tx.collection('accounts').updateById('acc-1', { balance: 900 });
  tx.collection('accounts').updateById('acc-2', { balance: 1100 });
  
  // If anything throws here, BOTH updates are automatically rolled back!
});
```

---

## ⚡ Electron Forge (Vite) Integration

### 1. Main Process (`src/main.ts`)
```typescript
import { app, ipcMain } from 'electron';
import path from 'path';
import { FSDB, registerFSDBIpc } from 'fsdb';

const dbPath = path.join(app.getPath('userData'), 'database.json');
const db = new FSDB(dbPath);

// Registers all IPC handlers in 1 line
registerFSDBIpc(ipcMain, db);
```

### 2. Preload (`src/preload.ts`)
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { createFSDBClient } from 'fsdb';

contextBridge.exposeInMainWorld('fsdb', createFSDBClient(ipcRenderer));
```

### 3. Frontend Renderer (`App.tsx` or `App.vue`)
```typescript
// In your Vite frontend:
const users = await window.fsdb.collection('users').find({ role: 'admin' });
await window.fsdb.collection('users').insert({ name: 'Alice' });

// Share data with another user:
await window.fsdb.exportToFile('C:/Users/Public/shared.json');
```

---

## 📖 API Reference

### `new FSDB(options?: string | FSDBOptions)`
Options:
- `filePath`: Path to the `.json` database file (Default: `'./fsdb.json'`)
- `pretty`: Indent JSON for human readability (Default: `true`)
- `syncMode`: `'sync'` (immediate disk write), `'async'` (background write), `'manual'` (explicit `db.save()`)
- `autoBackup`: Automatically create `.bak` snapshots on change (Default: `false`)
- `backupMaxCount`: Number of backup files to keep (Default: `5`)

### Database Methods
- `db.set(key, value)` / `db.get(key, default?)` / `db.has(key)` / `db.delete(key)`
- `db.collection<T>(name)`
- `db.listCollections()` / `db.dropCollection(name)`
- `db.exportToFile(path, options?)` / `db.importFromFile(path, options?)`
- `db.exportToJSON(options?)` / `db.importFromJSON(json, options?)`
- `db.transaction(fn)`
- `db.backup()` / `db.save()` / `db.reload()` / `db.clearAll()`
- `db.on(event, handler)` / `db.off(event, handler)`

### Collection Methods (`FSDBCollection<T>`)
- `insert(doc)` / `insertMany(docs)`
- `find(query?)` / `findOne(query)` / `findById(id)`
- `update(query, updater)` / `updateOne(query, updater)` / `updateById(id, updater)`
- `upsert(query, doc)`
- `delete(query)` / `deleteOne(query)` / `deleteById(id)`
- `count(query?)` / `exists(query)` / `clear()` / `all()`
- `query()` -> returns `QueryBuilder<T>`
- `exportToJSON()` / `importFromJSON(json, mode?)`

---

## 🧪 Testing

```bash
npm test
```

---

## 📄 License

MIT © 2026
