/**
 * Types and interfaces for FSDB - Single-File JSON Database
 */

export type DocumentId = string;

export interface BaseDocument {
  _id: DocumentId;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type InsertDoc<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'> & {
  _id?: DocumentId;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateDoc<T> = Partial<Omit<T, '_id' | 'createdAt'>> | ((doc: T & BaseDocument) => Partial<T> | void);

export type ElementOf<V> = V extends Array<infer U> ? U : V;

export interface QueryOperators<V = any> {
  $eq?: V | ElementOf<V>;
  $ne?: V | ElementOf<V>;
  $gt?: V | ElementOf<V>;
  $gte?: V | ElementOf<V>;
  $lt?: V | ElementOf<V>;
  $lte?: V | ElementOf<V>;
  $in?: (ElementOf<V> | V)[];
  $nin?: (ElementOf<V> | V)[];
  $between?: [V | ElementOf<V>, V | ElementOf<V>];
  $contains?: string | ElementOf<V> | any;
  $startsWith?: string;
  $endsWith?: string;
  $regex?: RegExp | string;
  $exists?: boolean;
  $all?: ElementOf<V>[];
  $size?: number;
  $includes?: ElementOf<V> | any;
  $where?: (value: V, doc: any) => boolean;
}

export type FieldQuery<V> = V | ElementOf<V> | QueryOperators<V>;

export type QueryFilter<T = any> = {
  [K in keyof T]?: FieldQuery<T[K]>;
} & {
  [dotPath: string]: any;
  $and?: QueryFilter<T>[];
  $or?: QueryFilter<T>[];
  $not?: QueryFilter<T>;
  $nor?: QueryFilter<T>[];
  $where?: (doc: T & BaseDocument) => boolean;
};

export type QueryPredicate<T> = QueryFilter<T> | ((doc: T & BaseDocument) => boolean);

export type SortDirection = 'asc' | 'desc' | 1 | -1;

export type SortCriteria<T = any> =
  | keyof T
  | string
  | { [K in keyof T]?: SortDirection }
  | { [field: string]: SortDirection }
  | Array<keyof T | string | [keyof T | string, SortDirection]>;

export interface FSDBOptions {
  /**
   * Path to the single JSON database file (e.g. './data.json', 'app.fsdb.json').
   * Default: './fsdb.json'
   */
  filePath?: string;

  /**
   * Format JSON output with indentation for readability.
   * Default: true
   */
  pretty?: boolean;

  /**
   * Synchronization mode:
   * - 'sync': Writes to disk immediately after each mutation (safest)
   * - 'async': Writes asynchronously in background
   * - 'manual': Only writes when `db.save()` is explicitly called
   * Default: 'sync'
   */
  syncMode?: 'sync' | 'async' | 'manual';

  /**
   * Debounce time in milliseconds when using 'async' syncMode.
   * Default: 0
   */
  debounceMs?: number;

  /**
   * Automatically create backup before critical changes or upon load.
   * Default: false
   */
  autoBackup?: boolean;

  /**
   * Maximum number of automatic backups to retain.
   * Default: 5
   */
  backupMaxCount?: number;

  /**
   * Custom ID generator function. Default generates unique nanoid-like string.
   */
  idGenerator?: () => string;
}

export interface DatabaseSchema {
  version: number;
  createdAt: string;
  updatedAt: string;
  kv: Record<string, any>;
  collections: Record<string, BaseDocument[]>;
}

export interface ExportMetadata {
  author?: string;
  description?: string;
  version?: string | number;
  tags?: string[];
  [key: string]: any;
}

export interface ExportOptions {
  /**
   * Specific collections to export. If omitted, all collections are exported.
   */
  collections?: string[];

  /**
   * Whether to include the Key-Value store. Default: true.
   */
  includeKV?: boolean;

  /**
   * Optional user metadata (e.g. author: "Alice", appVersion: "1.2.0").
   */
  metadata?: ExportMetadata;

  /**
   * Format JSON with indentation. Default: true.
   */
  pretty?: boolean;
}

export type ImportMergeMode = 'merge' | 'overwrite' | 'skip_existing';

export interface ImportOptions {
  /**
   * Merge mode when importing:
   * - 'merge': Updates existing documents by `_id`, inserts new documents, merges KV keys (Default)
   * - 'overwrite': Completely replaces target collections and KV store with imported data
   * - 'skip_existing': Inserts only documents whose `_id` does not already exist
   */
  mode?: ImportMergeMode;

  /**
   * Subset of collections to import. If omitted, imports all collections found in the export file.
   */
  collections?: string[];

  /**
   * Whether to import Key-Value store if present in file. Default: true.
   */
  includeKV?: boolean;
}

export interface ExportBundleJSON {
  fsdbFormatVersion: number;
  exportedAt: string;
  checksum: string;
  metadata: ExportMetadata;
  kv?: Record<string, any>;
  collections: Record<string, BaseDocument[]>;
}

export interface ImportResult {
  success: boolean;
  importedCollections: string[];
  documentsAdded: number;
  documentsUpdated: number;
  documentsSkipped: number;
  kvKeysImported: number;
  metadata: ExportMetadata;
  exportedAt: string;
}

export type DBEvent = 'change' | 'insert' | 'update' | 'delete' | 'save' | 'load' | 'export' | 'import' | 'error';

export interface DBChangeEvent<T = any> {
  type: 'insert' | 'update' | 'delete' | 'clear' | 'kv_set' | 'kv_delete' | 'kv_clear' | 'import';
  collection?: string;
  key?: string;
  documents?: (T & BaseDocument)[];
  ids?: DocumentId[];
  timestamp: string;
}

export interface IFSDB {
  getRawSchema(): DatabaseSchema;
  save(): void;
  collection<T = any>(name: string): any;
  set<T = any>(key: string, value: T): T;
  get<T = any>(key: string, defaultValue?: T): T | undefined;
  has(key: string): boolean;
  delete(key: string): boolean;
  [key: string]: any;
}
