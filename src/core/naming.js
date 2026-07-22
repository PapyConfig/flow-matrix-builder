/**
 * Naming convention system for Flow Matrix Builder.
 * Auto-generates consistent object names with configurable prefix/suffix patterns.
 * Persists settings to localStorage under a dedicated key.
 */

const SETTINGS_KEY = 'flow-matrix-naming-settings';

/** Default prefix per object type */
const DEFAULT_PREFIXES = {
  host: 'srv-',
  subnet: 'net-',
  range: 'rng-',
  group: 'grp-',
  vip: 'vip-',
  fw_allow: 'allow-',
  fw_deny: 'deny-',
};

/**
 * @typedef {Object} NamingSettings
 * @property {boolean} enabled - Whether auto-naming is active
 * @property {string} globalSuffix - Suffix appended to all names (e.g. "-prod")
 * @property {Record<string, string>} prefixes - Per-type prefix overrides
 */

function getDefaultSettings() {
  return {
    enabled: false,
    globalSuffix: '',
    prefixes: { ...DEFAULT_PREFIXES },
  };
}

/**
 * Concatenate two segments, avoiding double hyphens at the boundary.
 * @param {string} left
 * @param {string} right
 * @returns {string}
 */
function safeConcat(left, right) {
  if (!left) return right;
  if (!right) return left;
  if (left.endsWith('-') && right.startsWith('-')) {
    return left + right.slice(1);
  }
  return left + right;
}

/**
 * Load naming settings from localStorage.
 * @returns {NamingSettings}
 */
export function loadNamingSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultSettings(),
      ...parsed,
      prefixes: { ...DEFAULT_PREFIXES, ...(parsed.prefixes || {}) },
    };
  } catch {
    return getDefaultSettings();
  }
}

/**
 * Save naming settings to localStorage.
 * @param {NamingSettings} settings
 */
export function saveNamingSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save naming settings:', e);
  }
}

/**
 * Generate an auto-name for a new object.
 * @param {'host'|'subnet'|'range'|'group'|'vip'|'fw'} objectType
 * @param {string} userName - The user-provided name part
 * @param {'allow'|'deny'} [action] - For firewall rules
 * @returns {string}
 */
export function generateAutoName(objectType, userName, action) {
  const settings = loadNamingSettings();
  if (!settings.enabled) return userName;

  let prefixKey = objectType;
  if (objectType === 'fw') {
    prefixKey = action === 'deny' ? 'fw_deny' : 'fw_allow';
  }

  const prefix = settings.prefixes[prefixKey] || '';
  const suffix = settings.globalSuffix || '';

  // Build name: prefix + userName + suffix, avoiding double hyphens at each boundary
  return safeConcat(safeConcat(prefix, userName), suffix);
}

/**
 * Get a preview of what the next auto-name would look like.
 * @param {'host'|'subnet'|'range'|'group'|'vip'|'fw'} objectType
 * @param {string} exampleName
 * @param {'allow'|'deny'} [action]
 * @returns {string}
 */
export function getAutoNamePreview(objectType, exampleName, action) {
  const settings = loadNamingSettings();
  if (!settings.enabled) return exampleName;

  let prefixKey = objectType;
  if (objectType === 'fw') {
    prefixKey = action === 'deny' ? 'fw_deny' : 'fw_allow';
  }

  const prefix = settings.prefixes[prefixKey] || '';
  const suffix = settings.globalSuffix || '';

  return safeConcat(safeConcat(prefix, exampleName), suffix);
}

/**
 * Get the prefix key label for display.
 * @param {string} key
 * @returns {string}
 */
export function getPrefixLabel(key) {
  const labels = {
    host: 'Host',
    subnet: 'Subnet',
    range: 'Range',
    group: 'Group',
    vip: 'VIP',
    fw_allow: 'Firewall (Allow)',
    fw_deny: 'Firewall (Deny)',
  };
  return labels[key] || key;
}
