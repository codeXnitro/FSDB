'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs2 = require('fs');
var crypto = require('crypto');
var path2 = require('path');
var events = require('events');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var fs2__namespace = /*#__PURE__*/_interopNamespace(fs2);
var path2__namespace = /*#__PURE__*/_interopNamespace(path2);

// src/index.ts
function generateId() {
  const bytes = crypto.randomBytes(16);
  return bytes.toString("hex").slice(0, 24);
}
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function deepClone(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  const cloned = {};
  for (const key of Object.keys(value)) {
    cloned[key] = deepClone(value[key]);
  }
  return cloned;
}
function getNestedValue(obj, path3) {
  if (obj === null || obj === void 0 || !path3) {
    return void 0;
  }
  if (path3 in obj) {
    return obj[path3];
  }
  const parts = path3.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === void 0) {
      return void 0;
    }
    current = current[part];
  }
  return current;
}
function setNestedValue(obj, path3, value) {
  if (obj === null || typeof obj !== "object" || !path3) {
    return;
  }
  const parts = path3.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}
function computeChecksum(data) {
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

// src/query.ts
function matchFieldValue(actualValue, expected, doc) {
  if (expected === null || typeof expected !== "object" || expected instanceof RegExp || Array.isArray(expected)) {
    if (expected instanceof RegExp) {
      return typeof actualValue === "string" && expected.test(actualValue);
    }
    if (Array.isArray(expected) && Array.isArray(actualValue)) {
      if (expected.length !== actualValue.length) return false;
      return expected.every((val, idx) => val === actualValue[idx]);
    }
    return actualValue === expected;
  }
  const ops = expected;
  for (const opKey of Object.keys(ops)) {
    if (!opKey.startsWith("$")) {
      if (actualValue === null || typeof actualValue !== "object") return false;
      if (!matchFieldValue(actualValue[opKey], ops[opKey], doc)) {
        return false;
      }
      continue;
    }
    switch (opKey) {
      case "$eq":
        if (actualValue !== ops.$eq) return false;
        break;
      case "$ne":
        if (actualValue === ops.$ne) return false;
        break;
      case "$gt":
        if (typeof actualValue !== typeof ops.$gt || !(actualValue > ops.$gt)) return false;
        break;
      case "$gte":
        if (typeof actualValue !== typeof ops.$gte || !(actualValue >= ops.$gte)) return false;
        break;
      case "$lt":
        if (typeof actualValue !== typeof ops.$lt || !(actualValue < ops.$lt)) return false;
        break;
      case "$lte":
        if (typeof actualValue !== typeof ops.$lte || !(actualValue <= ops.$lte)) return false;
        break;
      case "$in":
        if (!Array.isArray(ops.$in)) return false;
        if (Array.isArray(actualValue)) {
          if (!actualValue.some((item) => ops.$in.includes(item))) return false;
        } else {
          if (!ops.$in.includes(actualValue)) return false;
        }
        break;
      case "$nin":
        if (!Array.isArray(ops.$nin)) return false;
        if (Array.isArray(actualValue)) {
          if (actualValue.some((item) => ops.$nin.includes(item))) return false;
        } else {
          if (ops.$nin.includes(actualValue)) return false;
        }
        break;
      case "$between":
        if (!Array.isArray(ops.$between) || ops.$between.length !== 2) return false;
        if (actualValue < ops.$between[0] || actualValue > ops.$between[1]) return false;
        break;
      case "$contains": {
        if (typeof actualValue === "string" && typeof ops.$contains === "string") {
          if (!actualValue.toLowerCase().includes(ops.$contains.toLowerCase())) return false;
        } else if (Array.isArray(actualValue)) {
          if (!actualValue.includes(ops.$contains)) return false;
        } else {
          return false;
        }
        break;
      }
      case "$startsWith":
        if (typeof actualValue !== "string" || !actualValue.startsWith(ops.$startsWith)) return false;
        break;
      case "$endsWith":
        if (typeof actualValue !== "string" || !actualValue.endsWith(ops.$endsWith)) return false;
        break;
      case "$regex": {
        const regex = ops.$regex instanceof RegExp ? ops.$regex : new RegExp(ops.$regex);
        if (typeof actualValue !== "string" || !regex.test(actualValue)) return false;
        break;
      }
      case "$exists": {
        const exists = actualValue !== void 0;
        if (exists !== Boolean(ops.$exists)) return false;
        break;
      }
      case "$all":
        if (!Array.isArray(actualValue) || !Array.isArray(ops.$all)) return false;
        if (!ops.$all.every((item) => actualValue.includes(item))) return false;
        break;
      case "$size":
        if (!Array.isArray(actualValue) || actualValue.length !== ops.$size) return false;
        break;
      case "$includes":
        if (!Array.isArray(actualValue) || !actualValue.includes(ops.$includes)) return false;
        break;
      case "$where":
        if (typeof ops.$where === "function" && !ops.$where(actualValue, doc)) return false;
        break;
    }
  }
  return true;
}
function matchDocument(doc, query) {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }
  if (typeof query === "function") {
    return Boolean(query(doc));
  }
  const filter = query;
  if (filter.$and && Array.isArray(filter.$and)) {
    if (!filter.$and.every((subQuery) => matchDocument(doc, subQuery))) return false;
  }
  if (filter.$or && Array.isArray(filter.$or)) {
    if (!filter.$or.some((subQuery) => matchDocument(doc, subQuery))) return false;
  }
  if (filter.$not && typeof filter.$not === "object") {
    if (matchDocument(doc, filter.$not)) return false;
  }
  if (filter.$nor && Array.isArray(filter.$nor)) {
    if (filter.$nor.some((subQuery) => matchDocument(doc, subQuery))) return false;
  }
  if (filter.$where && typeof filter.$where === "function") {
    if (!filter.$where(doc)) return false;
  }
  for (const [key, expected] of Object.entries(filter)) {
    if (key.startsWith("$")) continue;
    const actualValue = getNestedValue(doc, key);
    if (!matchFieldValue(actualValue, expected, doc)) {
      return false;
    }
  }
  return true;
}
function normalizeSortCriteria(criteria) {
  if (!criteria) return [];
  const result = [];
  const parseDirection = (dir) => {
    if (dir === "desc" || dir === -1) return -1;
    return 1;
  };
  if (typeof criteria === "string") {
    result.push([criteria, 1]);
  } else if (Array.isArray(criteria)) {
    for (const item of criteria) {
      if (typeof item === "string") {
        result.push([item, 1]);
      } else if (Array.isArray(item) && item.length >= 2) {
        result.push([String(item[0]), parseDirection(item[1])]);
      }
    }
  } else if (typeof criteria === "object") {
    for (const [field, dir] of Object.entries(criteria)) {
      result.push([field, parseDirection(dir)]);
    }
  }
  return result;
}
function sortDocuments(docs, criteria) {
  const normalized = normalizeSortCriteria(criteria);
  if (normalized.length === 0) return docs;
  return [...docs].sort((a, b) => {
    for (const [field, dir] of normalized) {
      const valA = getNestedValue(a, field);
      const valB = getNestedValue(b, field);
      if (valA === valB) continue;
      if (valA === void 0 || valA === null) return 1 * dir;
      if (valB === void 0 || valB === null) return -1 * dir;
      if (typeof valA === "string" && typeof valB === "string") {
        const cmp = valA.localeCompare(valB);
        if (cmp !== 0) return cmp * dir;
      } else {
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
      }
    }
    return 0;
  });
}
var QueryBuilder = class {
  _docsProvider;
  _filters = [];
  _sortCriteria;
  _limit;
  _skip;
  constructor(docsProvider) {
    this._docsProvider = docsProvider;
  }
  /**
   * Adds a query filter or field constraint.
   */
  where(fieldOrFilter, operatorOrValue, value) {
    if (typeof fieldOrFilter === "object" && fieldOrFilter !== null) {
      this._filters.push(fieldOrFilter);
      return this;
    }
    const field = String(fieldOrFilter);
    if (value !== void 0) {
      const opMap = {
        "=": "$eq",
        "==": "$eq",
        "===": "$eq",
        "!=": "$ne",
        "!==": "$ne",
        ">": "$gt",
        ">=": "$gte",
        "<": "$lt",
        "<=": "$lte",
        in: "$in",
        nin: "$nin",
        contains: "$contains",
        startsWith: "$startsWith",
        endsWith: "$endsWith",
        regex: "$regex"
      };
      const op = opMap[operatorOrValue] || operatorOrValue;
      this._filters.push({ [field]: { [op]: value } });
    } else {
      this._filters.push({ [field]: operatorOrValue });
    }
    return this;
  }
  and(...filters) {
    this._filters.push(...filters);
    return this;
  }
  or(...filters) {
    this._filters.push({ $or: filters });
    return this;
  }
  sortBy(criteria) {
    this._sortCriteria = criteria;
    return this;
  }
  limit(count) {
    this._limit = Math.max(0, count);
    return this;
  }
  skip(count) {
    this._skip = Math.max(0, count);
    return this;
  }
  /**
   * Executes the query and returns matching documents.
   */
  exec() {
    let docs = this._docsProvider();
    if (this._filters.length > 0) {
      docs = docs.filter((doc) => this._filters.every((filter) => matchDocument(doc, filter)));
    }
    if (this._sortCriteria) {
      docs = sortDocuments(docs, this._sortCriteria);
    }
    if (this._skip && this._skip > 0) {
      docs = docs.slice(this._skip);
    }
    if (this._limit !== void 0 && this._limit >= 0) {
      docs = docs.slice(0, this._limit);
    }
    return docs;
  }
  /**
   * Returns the first matching document, or null if none.
   */
  first() {
    const results = this.limit(1).exec();
    return results.length > 0 ? results[0] : null;
  }
  /**
   * Returns count of matching documents.
   */
  count() {
    let docs = this._docsProvider();
    if (this._filters.length > 0) {
      docs = docs.filter((doc) => this._filters.every((filter) => matchDocument(doc, filter)));
    }
    return docs.length;
  }
  /**
   * Checks if any matching document exists.
   */
  exists() {
    return this.count() > 0;
  }
  /**
   * Helper for pagination: returns page items, total count, total pages, etc.
   */
  paginate(page = 1, pageSize = 10) {
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, pageSize);
    const total = this.count();
    const totalPages = Math.ceil(total / validPageSize) || 1;
    const data = this.skip((validPage - 1) * validPageSize).limit(validPageSize).exec();
    return {
      data,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPrevPage: validPage > 1
    };
  }
};
function createExportBundle(schema, options) {
  const opts = options || {};
  const exportedAt = nowISO();
  const metadata = opts.metadata || {};
  const collectionsToExport = {};
  const targetCollections = opts.collections ? opts.collections : Object.keys(schema.collections);
  for (const collName of targetCollections) {
    if (schema.collections[collName]) {
      collectionsToExport[collName] = deepClone(schema.collections[collName]);
    } else {
      collectionsToExport[collName] = [];
    }
  }
  const exportPayload = {
    collections: collectionsToExport
  };
  if (opts.includeKV !== false && schema.kv) {
    exportPayload.kv = deepClone(schema.kv);
  }
  const checksum = computeChecksum(exportPayload);
  const bundle = {
    fsdbFormatVersion: 1,
    exportedAt,
    checksum,
    metadata,
    ...exportPayload.kv ? { kv: exportPayload.kv } : {},
    collections: exportPayload.collections
  };
  return bundle;
}
function exportToJSONString(schema, options) {
  const bundle = createExportBundle(schema, options);
  const pretty = options?.pretty ?? true;
  return pretty ? JSON.stringify(bundle, null, 2) : JSON.stringify(bundle);
}
function exportToFileSync(schema, filePath, options) {
  const resolvedPath = path2__namespace.resolve(process.cwd(), filePath);
  const dir = path2__namespace.dirname(resolvedPath);
  if (!fs2__namespace.existsSync(dir)) {
    fs2__namespace.mkdirSync(dir, { recursive: true });
  }
  const json = exportToJSONString(schema, options);
  fs2__namespace.writeFileSync(resolvedPath, json, "utf-8");
}
function parseExportBundle(input) {
  let bundle;
  if (typeof input === "string") {
    try {
      bundle = JSON.parse(input);
    } catch (e) {
      throw new Error(`[FSDB Sharing] Invalid JSON export file: ${e.message}`);
    }
  } else if (typeof input === "object" && input !== null) {
    bundle = input;
  } else {
    throw new Error("[FSDB Sharing] Invalid input: Expected JSON string or object");
  }
  if (!bundle.collections || typeof bundle.collections !== "object") {
    if (Array.isArray(bundle)) {
      bundle = {
        fsdbFormatVersion: 1,
        exportedAt: nowISO(),
        checksum: computeChecksum({ collections: { default: bundle } }),
        metadata: {},
        collections: { default: bundle }
      };
    } else {
      throw new Error('[FSDB Sharing] Export data must contain a "collections" object or document array.');
    }
  }
  if (bundle.checksum) {
    const payloadToCheck = {
      collections: bundle.collections
    };
    if (bundle.kv) {
      payloadToCheck.kv = bundle.kv;
    }
    const expectedChecksum = computeChecksum(payloadToCheck);
    if (bundle.checksum !== expectedChecksum) {
      console.warn("[FSDB Sharing] Checksum mismatch in import data. Proceeding with import...");
    }
  }
  return bundle;
}
function applyImport(schema, bundleInput, options) {
  const bundle = parseExportBundle(bundleInput);
  const mode = options?.mode || "merge";
  const targetCollections = options?.collections;
  const includeKV = options?.includeKV ?? true;
  let documentsAdded = 0;
  let documentsUpdated = 0;
  let documentsSkipped = 0;
  let kvKeysImported = 0;
  const importedCollections = [];
  const collNames = Object.keys(bundle.collections);
  for (const collName of collNames) {
    if (targetCollections && !targetCollections.includes(collName)) {
      continue;
    }
    importedCollections.push(collName);
    const importedDocs = bundle.collections[collName] || [];
    if (!schema.collections[collName]) {
      schema.collections[collName] = [];
    }
    if (mode === "overwrite") {
      const existingCount = schema.collections[collName].length;
      schema.collections[collName] = deepClone(importedDocs);
      documentsAdded += importedDocs.length;
      documentsUpdated += Math.min(existingCount, importedDocs.length);
      continue;
    }
    const currentDocs = schema.collections[collName];
    const docMap = /* @__PURE__ */ new Map();
    currentDocs.forEach((doc, idx) => {
      if (doc._id) docMap.set(doc._id, idx);
    });
    for (const doc of importedDocs) {
      const docId = doc._id;
      if (docId && docMap.has(docId)) {
        if (mode === "merge") {
          const existingIdx = docMap.get(docId);
          currentDocs[existingIdx] = {
            ...currentDocs[existingIdx],
            ...deepClone(doc),
            updatedAt: nowISO()
          };
          documentsUpdated++;
        } else if (mode === "skip_existing") {
          documentsSkipped++;
        }
      } else {
        const newDoc = deepClone(doc);
        if (!newDoc._id) {
          newDoc._id = Math.random().toString(36).slice(2, 14);
        }
        if (!newDoc.createdAt) newDoc.createdAt = nowISO();
        if (!newDoc.updatedAt) newDoc.updatedAt = newDoc.createdAt;
        currentDocs.push(newDoc);
        docMap.set(newDoc._id, currentDocs.length - 1);
        documentsAdded++;
      }
    }
  }
  if (includeKV && bundle.kv && typeof bundle.kv === "object") {
    if (!schema.kv) schema.kv = {};
    if (mode === "overwrite") {
      schema.kv = deepClone(bundle.kv);
      kvKeysImported += Object.keys(bundle.kv).length;
    } else if (mode === "merge") {
      for (const [k, v] of Object.entries(bundle.kv)) {
        schema.kv[k] = deepClone(v);
        kvKeysImported++;
      }
    } else if (mode === "skip_existing") {
      for (const [k, v] of Object.entries(bundle.kv)) {
        if (!(k in schema.kv)) {
          schema.kv[k] = deepClone(v);
          kvKeysImported++;
        }
      }
    }
  }
  schema.updatedAt = nowISO();
  return {
    success: true,
    importedCollections,
    documentsAdded,
    documentsUpdated,
    documentsSkipped,
    kvKeysImported,
    metadata: bundle.metadata || {},
    exportedAt: bundle.exportedAt || nowISO()
  };
}
function importFromFileSync(schema, filePath, options) {
  const resolvedPath = path2__namespace.resolve(process.cwd(), filePath);
  if (!fs2__namespace.existsSync(resolvedPath)) {
    throw new Error(`[FSDB Sharing] Import file not found: ${resolvedPath}`);
  }
  const raw = fs2__namespace.readFileSync(resolvedPath, "utf-8");
  return applyImport(schema, raw, options);
}

// src/collection.ts
var FSDBCollection = class {
  name;
  _schema;
  _storage;
  _events;
  _idGenerator;
  constructor(name, schema, storage, events, idGenerator) {
    this.name = name;
    this._schema = schema;
    this._storage = storage;
    this._events = events;
    this._idGenerator = idGenerator;
    if (!this._schema.collections[name]) {
      this._schema.collections[name] = [];
    }
  }
  get _docs() {
    if (!this._schema.collections[this.name]) {
      this._schema.collections[this.name] = [];
    }
    return this._schema.collections[this.name];
  }
  /**
   * Inserts a single document. Automatically sets `_id`, `createdAt`, and `updatedAt`.
   */
  insert(doc) {
    const id = doc._id || (this._idGenerator ? this._idGenerator() : generateId());
    const now = nowISO();
    const newDoc = {
      ...deepClone(doc),
      _id: id,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now
    };
    this._docs.push(newDoc);
    this._storage.save(this._schema);
    this._events.emit("insert", {
      type: "insert",
      collection: this.name,
      documents: [newDoc],
      ids: [id],
      timestamp: now
    });
    this._events.emit("change", {
      type: "insert",
      collection: this.name,
      documents: [newDoc],
      ids: [id],
      timestamp: now
    });
    return deepClone(newDoc);
  }
  /**
   * Inserts multiple documents in a single atomic batch.
   */
  insertMany(docs) {
    if (!docs || docs.length === 0) return [];
    const now = nowISO();
    const inserted = [];
    const ids = [];
    for (const doc of docs) {
      const id = doc._id || (this._idGenerator ? this._idGenerator() : generateId());
      const newDoc = {
        ...deepClone(doc),
        _id: id,
        createdAt: doc.createdAt || now,
        updatedAt: doc.updatedAt || now
      };
      this._docs.push(newDoc);
      inserted.push(newDoc);
      ids.push(id);
    }
    this._storage.save(this._schema);
    this._events.emit("insert", {
      type: "insert",
      collection: this.name,
      documents: inserted,
      ids,
      timestamp: now
    });
    this._events.emit("change", {
      type: "insert",
      collection: this.name,
      documents: inserted,
      ids,
      timestamp: now
    });
    return deepClone(inserted);
  }
  /**
   * Finds all documents matching the query criteria or predicate.
   */
  find(query) {
    const results = this._docs.filter((doc) => matchDocument(doc, query));
    return deepClone(results);
  }
  /**
   * Finds the first document matching query criteria.
   */
  findOne(query) {
    const doc = this._docs.find((d) => matchDocument(d, query));
    return doc ? deepClone(doc) : null;
  }
  /**
   * Finds a document by its unique `_id`.
   */
  findById(id) {
    const doc = this._docs.find((d) => d._id === id);
    return doc ? deepClone(doc) : null;
  }
  /**
   * Updates all documents matching the query.
   */
  update(query, updater) {
    const now = nowISO();
    const updatedDocs = [];
    const ids = [];
    for (let i = 0; i < this._docs.length; i++) {
      const doc = this._docs[i];
      if (matchDocument(doc, query)) {
        if (typeof updater === "function") {
          const mod = updater(deepClone(doc));
          if (mod && typeof mod === "object") {
            Object.assign(doc, deepClone(mod));
          }
        } else if (typeof updater === "object" && updater !== null) {
          Object.assign(doc, deepClone(updater));
        }
        doc.updatedAt = now;
        updatedDocs.push(deepClone(doc));
        ids.push(doc._id);
      }
    }
    if (updatedDocs.length > 0) {
      this._storage.save(this._schema);
      this._events.emit("update", {
        type: "update",
        collection: this.name,
        documents: updatedDocs,
        ids,
        timestamp: now
      });
      this._events.emit("change", {
        type: "update",
        collection: this.name,
        documents: updatedDocs,
        ids,
        timestamp: now
      });
    }
    return updatedDocs;
  }
  /**
   * Updates only the first document matching the query.
   */
  updateOne(query, updater) {
    const now = nowISO();
    const doc = this._docs.find((d) => matchDocument(d, query));
    if (!doc) return null;
    if (typeof updater === "function") {
      const mod = updater(deepClone(doc));
      if (mod && typeof mod === "object") {
        Object.assign(doc, deepClone(mod));
      }
    } else if (typeof updater === "object" && updater !== null) {
      Object.assign(doc, deepClone(updater));
    }
    doc.updatedAt = now;
    this._storage.save(this._schema);
    const cloned = deepClone(doc);
    this._events.emit("update", {
      type: "update",
      collection: this.name,
      documents: [cloned],
      ids: [doc._id],
      timestamp: now
    });
    this._events.emit("change", {
      type: "update",
      collection: this.name,
      documents: [cloned],
      ids: [doc._id],
      timestamp: now
    });
    return cloned;
  }
  /**
   * Updates a document by its unique `_id`.
   */
  updateById(id, updater) {
    return this.updateOne(((d) => d._id === id), updater);
  }
  /**
   * Updates an existing document if matched; otherwise inserts a new document (Upsert).
   */
  upsert(query, doc) {
    const existing = this.findOne(query);
    if (existing) {
      return this.updateById(existing._id, doc);
    }
    return this.insert(doc);
  }
  /**
   * Deletes all documents matching the query.
   */
  delete(query) {
    const now = nowISO();
    const removed = [];
    const remaining = [];
    const ids = [];
    for (const doc of this._docs) {
      if (matchDocument(doc, query)) {
        removed.push(deepClone(doc));
        ids.push(doc._id);
      } else {
        remaining.push(doc);
      }
    }
    if (removed.length > 0) {
      this._schema.collections[this.name] = remaining;
      this._storage.save(this._schema);
      this._events.emit("delete", {
        type: "delete",
        collection: this.name,
        documents: removed,
        ids,
        timestamp: now
      });
      this._events.emit("change", {
        type: "delete",
        collection: this.name,
        documents: removed,
        ids,
        timestamp: now
      });
    }
    return removed;
  }
  /**
   * Deletes the first document matching the query.
   */
  deleteOne(query) {
    const index = this._docs.findIndex((d) => matchDocument(d, query));
    if (index === -1) return null;
    const [deleted] = this._docs.splice(index, 1);
    const now = nowISO();
    this._storage.save(this._schema);
    const cloned = deepClone(deleted);
    this._events.emit("delete", {
      type: "delete",
      collection: this.name,
      documents: [cloned],
      ids: [deleted._id],
      timestamp: now
    });
    this._events.emit("change", {
      type: "delete",
      collection: this.name,
      documents: [cloned],
      ids: [deleted._id],
      timestamp: now
    });
    return cloned;
  }
  /**
   * Deletes a document by its unique `_id`.
   */
  deleteById(id) {
    return this.deleteOne(((d) => d._id === id));
  }
  /**
   * Returns count of documents matching the query (or total count if query omitted).
   */
  count(query) {
    if (!query) return this._docs.length;
    return this._docs.filter((doc) => matchDocument(doc, query)).length;
  }
  /**
   * Checks if at least one matching document exists.
   */
  exists(query) {
    return this._docs.some((doc) => matchDocument(doc, query));
  }
  /**
   * Clears all documents in this collection.
   */
  clear() {
    const count = this._docs.length;
    if (count === 0) return;
    this._schema.collections[this.name] = [];
    this._storage.save(this._schema);
    const now = nowISO();
    this._events.emit("change", {
      type: "clear",
      collection: this.name,
      timestamp: now
    });
  }
  /**
   * Returns all documents in this collection.
   */
  all() {
    return deepClone(this._docs);
  }
  /**
   * Starts a fluent chainable query builder.
   */
  query() {
    return new QueryBuilder(() => deepClone(this._docs));
  }
  /**
   * Exports this single collection to a JSON string.
   */
  exportToJSON(options) {
    return exportToJSONString(this._schema, {
      ...options,
      collections: [this.name],
      includeKV: false
    });
  }
  /**
   * Imports documents into this collection from a JSON string or bundle.
   */
  importFromJSON(jsonInput, mode = "merge") {
    let bundle;
    if (typeof jsonInput === "string") {
      try {
        bundle = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error(`[FSDB] Invalid JSON: ${e.message}`);
      }
    } else {
      bundle = jsonInput;
    }
    if (Array.isArray(bundle)) {
      bundle = {
        collections: {
          [this.name]: bundle
        }
      };
    } else if (bundle.collections && !bundle.collections[this.name]) {
      const firstKey = Object.keys(bundle.collections)[0];
      if (firstKey) {
        bundle.collections[this.name] = bundle.collections[firstKey];
      }
    }
    const result = applyImport(this._schema, bundle, {
      mode,
      collections: [this.name],
      includeKV: false
    });
    this._storage.save(this._schema);
    return result;
  }
};
var DBEventEmitter = class {
  _emitter = new events.EventEmitter();
  constructor() {
    this._emitter.setMaxListeners(100);
  }
  on(event, listener) {
    this._emitter.on(event, listener);
    return this;
  }
  once(event, listener) {
    this._emitter.once(event, listener);
    return this;
  }
  off(event, listener) {
    this._emitter.off(event, listener);
    return this;
  }
  emit(event, data) {
    return this._emitter.emit(event, data);
  }
  removeAllListeners(event) {
    this._emitter.removeAllListeners(event);
    return this;
  }
  listenerCount(event) {
    return this._emitter.listenerCount(event);
  }
};

// src/kv.ts
var FSDBKV = class {
  _schema;
  _storage;
  _events;
  constructor(schema, storage, events) {
    this._schema = schema;
    this._storage = storage;
    this._events = events;
  }
  /**
   * Sets a key-value pair. Persists immediately according to storage syncMode.
   */
  set(key, value) {
    if (!this._schema.kv) {
      this._schema.kv = {};
    }
    this._schema.kv[key] = deepClone(value);
    this._storage.save(this._schema);
    this._events.emit("change", {
      type: "kv_set",
      key,
      timestamp: nowISO()
    });
    return value;
  }
  /**
   * Gets a value by key. Returns undefined if not found.
   */
  get(key, defaultValue) {
    if (!this._schema.kv || !(key in this._schema.kv)) {
      return defaultValue;
    }
    return deepClone(this._schema.kv[key]);
  }
  /**
   * Checks if a key exists in KV store.
   */
  has(key) {
    return Boolean(this._schema.kv && key in this._schema.kv);
  }
  /**
   * Deletes a key from the KV store. Returns true if removed, false otherwise.
   */
  delete(key) {
    if (!this._schema.kv || !(key in this._schema.kv)) {
      return false;
    }
    delete this._schema.kv[key];
    this._storage.save(this._schema);
    this._events.emit("change", {
      type: "kv_delete",
      key,
      timestamp: nowISO()
    });
    return true;
  }
  /**
   * Returns all keys in KV store.
   */
  keys() {
    return this._schema.kv ? Object.keys(this._schema.kv) : [];
  }
  /**
   * Returns all values in KV store.
   */
  values() {
    return this._schema.kv ? Object.values(this._schema.kv).map((v) => deepClone(v)) : [];
  }
  /**
   * Returns all entries as [key, value] pairs.
   */
  entries() {
    return this._schema.kv ? Object.entries(this._schema.kv).map(([k, v]) => [k, deepClone(v)]) : [];
  }
  /**
   * Returns the entire KV store as a plain object.
   */
  all() {
    return this._schema.kv ? deepClone(this._schema.kv) : {};
  }
  /**
   * Clears all keys from KV store.
   */
  clear() {
    this._schema.kv = {};
    this._storage.save(this._schema);
    this._events.emit("change", {
      type: "kv_clear",
      timestamp: nowISO()
    });
  }
};
var FileStorage = class {
  filePath;
  pretty;
  syncMode;
  debounceMs;
  autoBackup;
  backupMaxCount;
  debounceTimer = null;
  isWriting = false;
  pendingWrite = false;
  constructor(options) {
    let opts = {};
    if (typeof options === "string") {
      opts = { filePath: options };
    } else if (options) {
      opts = options;
    }
    this.filePath = path2__namespace.resolve(process.cwd(), opts.filePath || "./fsdb.json");
    this.pretty = opts.pretty ?? true;
    this.syncMode = opts.syncMode ?? "sync";
    this.debounceMs = opts.debounceMs ?? 0;
    this.autoBackup = opts.autoBackup ?? false;
    this.backupMaxCount = opts.backupMaxCount ?? 5;
    this.ensureDirectory();
  }
  /**
   * Ensures parent directory of the database file exists.
   */
  ensureDirectory() {
    const dir = path2__namespace.dirname(this.filePath);
    if (!fs2__namespace.existsSync(dir)) {
      fs2__namespace.mkdirSync(dir, { recursive: true });
    }
  }
  /**
   * Default initial empty database structure.
   */
  getDefaultSchema() {
    const now = nowISO();
    return {
      version: 1,
      createdAt: now,
      updatedAt: now,
      kv: {},
      collections: {}
    };
  }
  /**
   * Loads the database from disk synchronously.
   */
  load() {
    this.ensureDirectory();
    if (!fs2__namespace.existsSync(this.filePath)) {
      const initialData = this.getDefaultSchema();
      this.writeSync(initialData);
      return initialData;
    }
    try {
      const raw = fs2__namespace.readFileSync(this.filePath, "utf-8");
      if (!raw.trim()) {
        const initialData = this.getDefaultSchema();
        this.writeSync(initialData);
        return initialData;
      }
      const parsed = JSON.parse(raw);
      return this.validateAndNormalizeSchema(parsed);
    } catch (err) {
      if (this.autoBackup) {
        const recovered = this.tryRecoverFromBackup();
        if (recovered) return recovered;
      }
      throw new Error(`[FSDB] Failed to read database at ${this.filePath}: ${err.message}`);
    }
  }
  validateAndNormalizeSchema(data) {
    const now = nowISO();
    return {
      version: typeof data.version === "number" ? data.version : 1,
      createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
      kv: typeof data.kv === "object" && data.kv !== null ? data.kv : {},
      collections: typeof data.collections === "object" && data.collections !== null ? data.collections : {}
    };
  }
  /**
   * Writes data atomically using temporary file + rename with retry loop for Windows reliability.
   */
  writeSync(data) {
    this.ensureDirectory();
    data.updatedAt = nowISO();
    const json = this.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    const tempPath = `${this.filePath}.tmp.${Date.now()}.${crypto.randomBytes(4).toString("hex")}`;
    try {
      fs2__namespace.writeFileSync(tempPath, json, "utf-8");
      if (this.autoBackup && fs2__namespace.existsSync(this.filePath)) {
        this.createBackupSync();
      }
      let retries = 5;
      while (retries > 0) {
        try {
          fs2__namespace.renameSync(tempPath, this.filePath);
          break;
        } catch (err) {
          retries--;
          if (retries === 0) {
            fs2__namespace.copyFileSync(tempPath, this.filePath);
            try {
              fs2__namespace.unlinkSync(tempPath);
            } catch (_) {
            }
            break;
          }
          const start = Date.now();
          while (Date.now() - start < 15) {
          }
        }
      }
    } finally {
      if (fs2__namespace.existsSync(tempPath)) {
        try {
          fs2__namespace.unlinkSync(tempPath);
        } catch (_) {
        }
      }
    }
  }
  /**
   * Schedules or executes persistence based on syncMode.
   */
  save(data) {
    if (this.syncMode === "sync") {
      this.writeSync(data);
    } else if (this.syncMode === "async") {
      if (this.debounceMs > 0) {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
          this.writeAsync(data).catch(() => {
          });
        }, this.debounceMs);
      } else {
        this.writeAsync(data).catch(() => {
        });
      }
    }
  }
  /**
   * Async atomic write.
   */
  async writeAsync(data) {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }
    this.isWriting = true;
    try {
      this.ensureDirectory();
      data.updatedAt = nowISO();
      const json = this.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      const tempPath = `${this.filePath}.tmp.${Date.now()}.${crypto.randomBytes(4).toString("hex")}`;
      await fs2__namespace.promises.writeFile(tempPath, json, "utf-8");
      try {
        await fs2__namespace.promises.rename(tempPath, this.filePath);
      } catch (renameErr) {
        await fs2__namespace.promises.copyFile(tempPath, this.filePath);
        await fs2__namespace.promises.unlink(tempPath).catch(() => {
        });
      }
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        await this.writeAsync(data);
      }
    }
  }
  /**
   * Creates a backup copy of the current database file.
   */
  createBackupSync() {
    if (!fs2__namespace.existsSync(this.filePath)) return null;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupPath = `${this.filePath}.bak.${timestamp}`;
    fs2__namespace.copyFileSync(this.filePath, backupPath);
    this.cleanOldBackups();
    return backupPath;
  }
  cleanOldBackups() {
    try {
      const dir = path2__namespace.dirname(this.filePath);
      const baseName = path2__namespace.basename(this.filePath);
      const files = fs2__namespace.readdirSync(dir);
      const backupFiles = files.filter((file) => file.startsWith(`${baseName}.bak.`)).map((file) => path2__namespace.join(dir, file)).sort((a, b) => fs2__namespace.statSync(b).mtimeMs - fs2__namespace.statSync(a).mtimeMs);
      if (backupFiles.length > this.backupMaxCount) {
        const toDelete = backupFiles.slice(this.backupMaxCount);
        for (const file of toDelete) {
          try {
            fs2__namespace.unlinkSync(file);
          } catch (_) {
          }
        }
      }
    } catch (_) {
    }
  }
  tryRecoverFromBackup() {
    try {
      const dir = path2__namespace.dirname(this.filePath);
      const baseName = path2__namespace.basename(this.filePath);
      const files = fs2__namespace.readdirSync(dir);
      const backupFiles = files.filter((file) => file.startsWith(`${baseName}.bak.`)).map((file) => path2__namespace.join(dir, file)).sort((a, b) => fs2__namespace.statSync(b).mtimeMs - fs2__namespace.statSync(a).mtimeMs);
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles[0];
        const raw = fs2__namespace.readFileSync(latestBackup, "utf-8");
        const parsed = JSON.parse(raw);
        return this.validateAndNormalizeSchema(parsed);
      }
    } catch (_) {
    }
    return null;
  }
};

// src/transaction.ts
var TransactionSession = class {
  _db;
  _snapshot;
  constructor(db) {
    this._db = db;
    this._snapshot = deepClone(db.getRawSchema());
  }
  /**
   * Executes a transaction callback. If an error is thrown, all changes are rolled back.
   */
  async run(fn) {
    try {
      const result = await fn(this._db);
      this._db.save();
      return result;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }
  /**
   * Reverts database state to snapshot.
   */
  rollback() {
    const raw = this._db.getRawSchema();
    raw.collections = deepClone(this._snapshot.collections);
    raw.kv = deepClone(this._snapshot.kv);
    raw.version = this._snapshot.version;
    raw.updatedAt = this._snapshot.updatedAt;
  }
};

// src/electron.ts
function registerFSDBIpc(ipcMain, db, channelPrefix = "fsdb") {
  ipcMain.handle(`${channelPrefix}:kv:set`, async (_, key, value) => {
    return db.set(key, value);
  });
  ipcMain.handle(`${channelPrefix}:kv:get`, async (_, key, defaultValue) => {
    return db.get(key, defaultValue);
  });
  ipcMain.handle(`${channelPrefix}:kv:has`, async (_, key) => {
    return db.has(key);
  });
  ipcMain.handle(`${channelPrefix}:kv:delete`, async (_, key) => {
    return db.delete(key);
  });
  ipcMain.handle(`${channelPrefix}:kv:all`, async () => {
    return db.kv.all();
  });
  ipcMain.handle(`${channelPrefix}:collection:insert`, async (_, collName, doc) => {
    return db.collection(collName).insert(doc);
  });
  ipcMain.handle(`${channelPrefix}:collection:insertMany`, async (_, collName, docs) => {
    return db.collection(collName).insertMany(docs);
  });
  ipcMain.handle(`${channelPrefix}:collection:find`, async (_, collName, query) => {
    return db.collection(collName).find(query);
  });
  ipcMain.handle(`${channelPrefix}:collection:findOne`, async (_, collName, query) => {
    return db.collection(collName).findOne(query);
  });
  ipcMain.handle(`${channelPrefix}:collection:findById`, async (_, collName, id) => {
    return db.collection(collName).findById(id);
  });
  ipcMain.handle(`${channelPrefix}:collection:update`, async (_, collName, query, updater) => {
    return db.collection(collName).update(query, updater);
  });
  ipcMain.handle(`${channelPrefix}:collection:delete`, async (_, collName, query) => {
    return db.collection(collName).delete(query);
  });
  ipcMain.handle(`${channelPrefix}:collection:deleteById`, async (_, collName, id) => {
    return db.collection(collName).deleteById(id);
  });
  ipcMain.handle(`${channelPrefix}:collection:count`, async (_, collName, query) => {
    return db.collection(collName).count(query);
  });
  ipcMain.handle(`${channelPrefix}:collection:clear`, async (_, collName) => {
    return db.collection(collName).clear();
  });
  ipcMain.handle(`${channelPrefix}:exportToFile`, async (_, filePath, options) => {
    return db.exportToFile(filePath, options);
  });
  ipcMain.handle(`${channelPrefix}:importFromFile`, async (_, filePath, options) => {
    return db.importFromFile(filePath, options);
  });
  ipcMain.handle(`${channelPrefix}:exportToJSON`, async (_, options) => {
    return db.exportToJSON(options);
  });
  ipcMain.handle(`${channelPrefix}:importFromJSON`, async (_, jsonInput, options) => {
    return db.importFromJSON(jsonInput, options);
  });
}
function createFSDBClient(ipcRenderer, channelPrefix = "fsdb") {
  return {
    set: (key, value) => ipcRenderer.invoke(`${channelPrefix}:kv:set`, key, value),
    get: (key, defaultValue) => ipcRenderer.invoke(`${channelPrefix}:kv:get`, key, defaultValue),
    has: (key) => ipcRenderer.invoke(`${channelPrefix}:kv:has`, key),
    delete: (key) => ipcRenderer.invoke(`${channelPrefix}:kv:delete`, key),
    allKV: () => ipcRenderer.invoke(`${channelPrefix}:kv:all`),
    collection: (name) => ({
      insert: (doc) => ipcRenderer.invoke(`${channelPrefix}:collection:insert`, name, doc),
      insertMany: (docs) => ipcRenderer.invoke(`${channelPrefix}:collection:insertMany`, name, docs),
      find: (query) => ipcRenderer.invoke(`${channelPrefix}:collection:find`, name, query),
      findOne: (query) => ipcRenderer.invoke(`${channelPrefix}:collection:findOne`, name, query),
      findById: (id) => ipcRenderer.invoke(`${channelPrefix}:collection:findById`, name, id),
      update: (query, updater) => ipcRenderer.invoke(`${channelPrefix}:collection:update`, name, query, updater),
      delete: (query) => ipcRenderer.invoke(`${channelPrefix}:collection:delete`, name, query),
      deleteById: (id) => ipcRenderer.invoke(`${channelPrefix}:collection:deleteById`, name, id),
      count: (query) => ipcRenderer.invoke(`${channelPrefix}:collection:count`, name, query),
      clear: () => ipcRenderer.invoke(`${channelPrefix}:collection:clear`, name)
    }),
    exportToFile: (filePath, options) => ipcRenderer.invoke(`${channelPrefix}:exportToFile`, filePath, options),
    importFromFile: (filePath, options) => ipcRenderer.invoke(`${channelPrefix}:importFromFile`, filePath, options),
    exportToJSON: (options) => ipcRenderer.invoke(`${channelPrefix}:exportToJSON`, options),
    importFromJSON: (jsonInput, options) => ipcRenderer.invoke(`${channelPrefix}:importFromJSON`, jsonInput, options)
  };
}

// src/index.ts
var FSDB = class {
  _storage;
  _schema;
  _events;
  _collections = /* @__PURE__ */ new Map();
  _kv;
  _options;
  /**
   * Initializes or loads a single-file JSON database.
   * @param options File path string or options object.
   */
  constructor(options) {
    if (typeof options === "string") {
      this._options = { filePath: options };
    } else {
      this._options = options;
    }
    this._storage = new FileStorage(this._options);
    this._events = new DBEventEmitter();
    this._schema = this._storage.load();
    this._kv = new FSDBKV(this._schema, this._storage, this._events);
  }
  /**
   * Path to the single JSON database file on disk.
   */
  get filePath() {
    return this._storage.filePath;
  }
  /**
   * Dedicated Key-Value store instance.
   */
  get kv() {
    return this._kv;
  }
  /**
   * Current size of the database file on disk (in bytes).
   */
  get size() {
    try {
      if (fs2__namespace.existsSync(this.filePath)) {
        return fs2__namespace.statSync(this.filePath).size;
      }
    } catch (_) {
    }
    return 0;
  }
  /**
   * Gets or creates a typed document collection.
   */
  collection(name) {
    if (this._collections.has(name)) {
      return this._collections.get(name);
    }
    const coll = new FSDBCollection(
      name,
      this._schema,
      this._storage,
      this._events,
      this._options?.idGenerator
    );
    this._collections.set(name, coll);
    return coll;
  }
  /**
   * Alias for `collection()`.
   */
  getCollection(name) {
    return this.collection(name);
  }
  /**
   * Checks if a collection exists in the database.
   */
  hasCollection(name) {
    return Boolean(this._schema.collections && name in this._schema.collections);
  }
  /**
   * Returns a list of all collection names in the database.
   */
  listCollections() {
    return Object.keys(this._schema.collections || {});
  }
  /**
   * Drops a collection and removes all its documents.
   */
  dropCollection(name) {
    if (!this._schema.collections || !(name in this._schema.collections)) {
      return false;
    }
    delete this._schema.collections[name];
    this._collections.delete(name);
    this._storage.save(this._schema);
    this._events.emit("change", {
      type: "clear",
      collection: name,
      timestamp: nowISO()
    });
    return true;
  }
  // --- Key-Value Direct Shorthand Methods ---
  /**
   * Sets a key-value pair in the database KV store.
   */
  set(key, value) {
    return this._kv.set(key, value);
  }
  /**
   * Retrieves a value from the KV store.
   */
  get(key, defaultValue) {
    return this._kv.get(key, defaultValue);
  }
  /**
   * Checks if a key exists in the KV store.
   */
  has(key) {
    return this._kv.has(key);
  }
  /**
   * Deletes a key from the KV store.
   */
  delete(key) {
    return this._kv.delete(key);
  }
  /**
   * Returns all keys in the KV store.
   */
  keys() {
    return this._kv.keys();
  }
  /**
   * Returns all values in the KV store.
   */
  values() {
    return this._kv.values();
  }
  /**
   * Returns all [key, value] pairs in the KV store.
   */
  entries() {
    return this._kv.entries();
  }
  // --- Pure JSON Export & Import (A -> B Sharing) ---
  /**
   * Exports data to a pure JSON string.
   */
  exportToJSON(options) {
    return exportToJSONString(this._schema, options);
  }
  /**
   * Exports data directly to a `.json` file for sharing.
   */
  exportToFile(filePath, options) {
    exportToFileSync(this._schema, filePath, options);
    this._events.emit("export", { filePath, options, timestamp: nowISO() });
  }
  /**
   * Imports data from a JSON string or parsed object.
   */
  importFromJSON(jsonInput, options) {
    const result = applyImport(this._schema, jsonInput, options);
    this._storage.save(this._schema);
    this._events.emit("import", { result, options, timestamp: nowISO() });
    return result;
  }
  /**
   * Imports data directly from a `.json` file shared by another user.
   */
  importFromFile(filePath, options) {
    const result = importFromFileSync(this._schema, filePath, options);
    this._storage.save(this._schema);
    this._events.emit("import", { filePath, result, options, timestamp: nowISO() });
    return result;
  }
  on(event, listener) {
    this._events.on(event, listener);
    return this;
  }
  /**
   * Subscribes to a single event occurrence.
   */
  once(event, listener) {
    this._events.once(event, listener);
    return this;
  }
  /**
   * Removes an event listener.
   */
  off(event, listener) {
    this._events.off(event, listener);
    return this;
  }
  // --- Transactions ---
  /**
   * Runs multiple database operations in an isolated transaction.
   * If any error is thrown, changes are rolled back automatically.
   */
  async transaction(fn) {
    const session = new TransactionSession(this);
    return session.run(fn);
  }
  // --- Persistence & Backup Management ---
  /**
   * Manually persists database state to disk.
   */
  save() {
    this._storage.writeSync(this._schema);
    this._events.emit("save", { timestamp: nowISO() });
  }
  /**
   * Reloads the database from disk, discarding unsaved memory changes.
   */
  reload() {
    this._schema = this._storage.load();
    this._collections.clear();
    this._kv = new FSDBKV(this._schema, this._storage, this._events);
    this._events.emit("load", { timestamp: nowISO() });
  }
  /**
   * Creates an instant timestamped backup file (e.g. `db.json.bak.2026-...`).
   */
  backup() {
    return this._storage.createBackupSync();
  }
  /**
   * Clears all collections and key-value entries.
   */
  clearAll() {
    this._schema.collections = {};
    this._schema.kv = {};
    this._storage.save(this._schema);
  }
  /**
   * Internal reference to the raw in-memory schema.
   */
  getRawSchema() {
    return this._schema;
  }
};
var index_default = FSDB;

exports.DBEventEmitter = DBEventEmitter;
exports.FSDB = FSDB;
exports.FSDBCollection = FSDBCollection;
exports.FSDBKV = FSDBKV;
exports.FileStorage = FileStorage;
exports.QueryBuilder = QueryBuilder;
exports.TransactionSession = TransactionSession;
exports.applyImport = applyImport;
exports.computeChecksum = computeChecksum;
exports.createExportBundle = createExportBundle;
exports.createFSDBClient = createFSDBClient;
exports.deepClone = deepClone;
exports.default = index_default;
exports.exportToFileSync = exportToFileSync;
exports.exportToJSONString = exportToJSONString;
exports.generateId = generateId;
exports.getNestedValue = getNestedValue;
exports.importFromFileSync = importFromFileSync;
exports.matchDocument = matchDocument;
exports.matchFieldValue = matchFieldValue;
exports.nowISO = nowISO;
exports.parseExportBundle = parseExportBundle;
exports.registerFSDBIpc = registerFSDBIpc;
exports.setNestedValue = setNestedValue;
exports.sortDocuments = sortDocuments;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map