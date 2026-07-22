/**
 * Centralized pub/sub state store for Flow Matrix entities.
 * Persists to localStorage on every mutation.
 */

const STORAGE_KEY = 'flow-matrix-data';
const ENTITY_TYPES = ['objects', 'vips', 'rules'];

class Store {
  constructor() {
    /** @type {Map<string, Map<string, object>>} */
    this._data = new Map();
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Set<Function>} */
    this._globalListeners = new Set();

    for (const type of ENTITY_TYPES) {
      this._data.set(type, new Map());
      this._listeners.set(type, new Set());
    }

    this._load();
  }

  // --- Pub/Sub -------------------------------------------------------------

  /**
   * Subscribe to changes on a specific entity type.
   * @param {string} entityType
   * @param {Function} callback  Called with (items[], changeType, id?)
   * @returns {Function} unsubscribe function
   */
  subscribe(entityType, callback) {
    const set = this._listeners.get(entityType);
    if (!set) throw new Error(`Unknown entity type: ${entityType}`);
    set.add(callback);
    return () => set.delete(callback);
  }

  /**
   * Subscribe to all entity type changes.
   * @param {Function} callback  Called with (entityType, items[], changeType, id?)
   * @returns {Function} unsubscribe
   */
  subscribeAll(callback) {
    this._globalListeners.add(callback);
    return () => this._globalListeners.delete(callback);
  }

  _notify(entityType, changeType, id) {
    const items = this.getAll(entityType);
    const localSet = this._listeners.get(entityType);
    if (localSet) {
      for (const cb of localSet) {
        try { cb(items, changeType, id); } catch (e) { console.error(e); }
      }
    }
    for (const cb of this._globalListeners) {
      try { cb(entityType, items, changeType, id); } catch (e) { console.error(e); }
    }
  }

  // --- CRUD ----------------------------------------------------------------

  /**
   * @param {string} entityType
   * @returns {object[]}
   */
  getAll(entityType) {
    const map = this._data.get(entityType);
    if (!map) return [];
    return [...map.values()];
  }

  /**
   * @param {string} entityType
   * @param {string} id
   * @returns {object|undefined}
   */
  get(entityType, id) {
    const map = this._data.get(entityType);
    return map ? map.get(id) : undefined;
  }

  /**
   * @param {string} entityType
   * @param {object} item  Must have an `id` field.
   */
  add(entityType, item) {
    const map = this._data.get(entityType);
    if (!map) throw new Error(`Unknown entity type: ${entityType}`);
    map.set(item.id, { ...item });
    this._persist();
    this._notify(entityType, 'add', item.id);
  }

  /**
   * @param {string} entityType
   * @param {string} id
   * @param {Partial<object>} changes
   */
  update(entityType, id, changes) {
    const map = this._data.get(entityType);
    if (!map || !map.has(id)) return;
    map.set(id, { ...map.get(id), ...changes });
    this._persist();
    this._notify(entityType, 'update', id);
  }

  /**
   * @param {string} entityType
   * @param {string} id
   */
  remove(entityType, id) {
    const map = this._data.get(entityType);
    if (!map) return;
    map.delete(id);
    this._persist();
    this._notify(entityType, 'remove', id);
  }

  /**
   * Remove all items of a given type.
   * @param {string} entityType
   */
  clear(entityType) {
    const map = this._data.get(entityType);
    if (!map) return;
    map.clear();
    this._persist();
    this._notify(entityType, 'clear');
  }

  // --- Persistence ---------------------------------------------------------

  _persist() {
    try {
      const obj = {};
      for (const [type, map] of this._data) {
        obj[type] = [...map.values()];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('localStorage persist failed:', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const type of ENTITY_TYPES) {
        if (Array.isArray(obj[type])) {
          const map = this._data.get(type);
          for (const item of obj[type]) {
            if (item && item.id) map.set(item.id, item);
          }
        }
      }
    } catch (e) {
      console.warn('localStorage load failed:', e);
    }
  }
}

/** Singleton store instance */
export const store = new Store();
