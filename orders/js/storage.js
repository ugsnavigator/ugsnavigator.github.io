import { DEFAULT_PROFILE, clampNumber } from "./core.js";

const PROFILE_KEY = "school-order-constructor.profile.v2";
const DB_NAME = "school-order-constructor.local-assets.v1";
const DB_VERSION = 2;
const ASSET_STORE = "assets";
const ORDER_STORE = "orders";
const LETTERHEAD_KEY = "letterhead";
const ORDER_FALLBACK_KEY = "school-order-constructor.saved-orders.v1";
const MAX_SAVED_ORDERS = 300;

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return sanitizeProfile(JSON.parse(raw));
    const oldRaw = localStorage.getItem("school-order-constructor.profile.v1");
    if (oldRaw) return sanitizeProfile(JSON.parse(oldRaw));
    return { ...DEFAULT_PROFILE, staff: [] };
  } catch {
    return { ...DEFAULT_PROFILE, staff: [] };
  }
}

export function saveProfile(profile) {
  const safe = sanitizeProfile(profile);
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(safe)); } catch { /* file origin/privacy mode may deny storage */ }
  return safe;
}

export function sanitizeProfile(profile = {}) {
  const mode = ["standard", "preprinted", "image"].includes(profile.letterheadMode) ? profile.letterheadMode : "standard";
  return {
    institutionName: safeString(profile.institutionName, 240),
    shortName: safeString(profile.shortName, 120),
    location: safeString(profile.location, 120),
    edrpou: safeString(profile.edrpou, 12).replace(/[^0-9]/g, ""),
    signerPosition: safeString(profile.signerPosition || "Директор", 120),
    signerName: safeString(profile.signerName, 160),
    letterheadMode: mode,
    preprintedTopMm: clampNumber(profile.preprintedTopMm, 25, 100, 55),
    letterheadWidthMm: clampNumber(profile.letterheadWidthMm, 80, 180, 170),
    staff: sanitizeStaff(profile.staff),
  };
}

export function sanitizeStaff(staff) {
  if (!Array.isArray(staff)) return [];
  return staff.slice(0, 80).map((row) => ({
    position: safeString(row?.position, 120),
    name: safeString(row?.name, 160),
  })).filter((row) => row.position || row.name);
}

export function clearProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem("school-order-constructor.profile.v1");
  } catch { /* ignore unavailable storage */ }
}

export async function saveLetterheadAsset(asset) {
  const db = await openDb();
  await txPromise(db, ASSET_STORE, "readwrite", (store) => store.put({ key: LETTERHEAD_KEY, ...asset }));
  db.close();
}

export async function loadLetterheadAsset() {
  const db = await openDb();
  const value = await txPromise(db, ASSET_STORE, "readonly", (store) => store.get(LETTERHEAD_KEY));
  db.close();
  if (!value) return null;
  const bytes = value.bytes instanceof Uint8Array ? value.bytes : new Uint8Array(value.bytes || []);
  return { ...value, bytes };
}

export async function deleteLetterheadAsset() {
  const db = await openDb();
  await txPromise(db, ASSET_STORE, "readwrite", (store) => store.delete(LETTERHEAD_KEY));
  db.close();
}

export function sanitizeOrderRecord(record = {}) {
  const now = new Date().toISOString();
  return {
    id: safeString(record.id, 80),
    templateId: safeString(record.templateId, 100),
    title: safeString(record.title, 260),
    category: safeString(record.category, 100),
    orderDate: safeString(record.orderDate, 20),
    orderNumber: safeString(record.orderNumber, 80),
    status: record.status === "ready" ? "ready" : "draft",
    createdAt: safeIso(record.createdAt) || now,
    updatedAt: safeIso(record.updatedAt) || now,
    formData: sanitizeJsonTree(record.formData, 0),
  };
}

export async function saveOrderRecord(record) {
  const safe = sanitizeOrderRecord(record);
  if (!safe.id || !safe.templateId) throw new Error("Некоректний запис наказу");
  try {
    const db = await openDb();
    await txPromise(db, ORDER_STORE, "readwrite", (store) => store.put(safe));
    db.close();
    await trimSavedOrders();
    return safe;
  } catch {
    const current = loadFallbackOrders().filter((item) => item.id !== safe.id);
    current.unshift(safe);
    saveFallbackOrders(current.slice(0, MAX_SAVED_ORDERS));
    return safe;
  }
}

export async function listOrderRecords() {
  try {
    const db = await openDb();
    const values = await txPromise(db, ORDER_STORE, "readonly", (store) => store.getAll());
    db.close();
    const indexed = (Array.isArray(values) ? values : []).map(sanitizeOrderRecord);
    const fallback = loadFallbackOrders();
    const merged = new Map();
    [...indexed, ...fallback].forEach((item) => {
      const existing = merged.get(item.id);
      if (!existing || String(item.updatedAt) > String(existing.updatedAt)) merged.set(item.id, item);
    });
    return [...merged.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  } catch {
    return loadFallbackOrders().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
}

export async function getOrderRecord(id) {
  const safeId = safeString(id, 80);
  if (!safeId) return null;
  try {
    const db = await openDb();
    const value = await txPromise(db, ORDER_STORE, "readonly", (store) => store.get(safeId));
    db.close();
    if (value) return sanitizeOrderRecord(value);
  } catch { /* fallback below */ }
  return loadFallbackOrders().find((item) => item.id === safeId) || null;
}

export async function deleteOrderRecord(id) {
  const safeId = safeString(id, 80);
  try {
    const db = await openDb();
    await txPromise(db, ORDER_STORE, "readwrite", (store) => store.delete(safeId));
    db.close();
  } catch { /* fallback still removed below */ }
  saveFallbackOrders(loadFallbackOrders().filter((item) => item.id !== safeId));
}

export async function clearOrderRecords() {
  try {
    const db = await openDb();
    await txPromise(db, ORDER_STORE, "readwrite", (store) => store.clear());
    db.close();
  } catch { /* fallback still cleared below */ }
  try { localStorage.removeItem(ORDER_FALLBACK_KEY); } catch { /* ignore */ }
}

export async function importOrderRecords(records) {
  if (!Array.isArray(records)) throw new Error("Невірний формат резервної копії");
  const safeRecords = records.slice(0, MAX_SAVED_ORDERS).map(sanitizeOrderRecord).filter((x) => x.id && x.templateId);
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ORDER_STORE, "readwrite");
      const store = tx.objectStore(ORDER_STORE);
      safeRecords.forEach((record) => store.put(record));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
    db.close();
    await trimSavedOrders();
  } catch {
    const merged = new Map(loadFallbackOrders().map((item) => [item.id, item]));
    safeRecords.forEach((item) => merged.set(item.id, item));
    saveFallbackOrders([...merged.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, MAX_SAVED_ORDERS));
  }
  return safeRecords.length;
}

export async function clearAllLocalData() {
  clearProfile();
  try { await deleteLetterheadAsset(); } catch { /* IndexedDB may be unavailable */ }
  try { await clearOrderRecords(); } catch { /* IndexedDB may be unavailable */ }
}

async function trimSavedOrders() {
  const all = await listOrderRecords();
  if (all.length <= MAX_SAVED_ORDERS) return;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ORDER_STORE, "readwrite");
    const store = tx.objectStore(ORDER_STORE);
    all.slice(MAX_SAVED_ORDERS).forEach((record) => store.delete(record.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
  db.close();
}

function loadFallbackOrders() {
  try {
    const raw = localStorage.getItem(ORDER_FALLBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_ORDERS).map(sanitizeOrderRecord).filter((x) => x.id && x.templateId) : [];
  } catch {
    return [];
  }
}

function saveFallbackOrders(records) {
  try { localStorage.setItem(ORDER_FALLBACK_KEY, JSON.stringify(records.slice(0, MAX_SAVED_ORDERS))); } catch { /* unavailable/full storage */ }
}

function safeString(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .trim()
    .slice(0, max);
}

function safeIso(value) {
  const text = safeString(value, 40);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function sanitizeJsonTree(value, depth) {
  if (depth > 7) return "";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeJsonTree(item, depth + 1));
  if (value && typeof value === "object") {
    const out = Object.create(null);
    Object.entries(value).slice(0, 120).forEach(([key, item]) => {
      const safeKey = safeString(key, 100);
      if (!safeKey || ["__proto__", "constructor", "prototype"].includes(safeKey)) return;
      out[safeKey] = sanitizeJsonTree(item, depth + 1);
    });
    return out;
  }
  if (typeof value === "boolean" || typeof value === "number") return value;
  return safeString(value, 5000);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("IndexedDB error"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(ORDER_STORE)) db.createObjectStore(ORDER_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function txPromise(db, storeName, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);
    let result;
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error("IndexedDB request error"));
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction error"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}
