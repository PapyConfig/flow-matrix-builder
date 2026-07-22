/**
 * Validation schemas for Flow Matrix entities.
 * Each validator returns { valid: boolean, errors: Record<string, string> }.
 */

// --- Helpers ---------------------------------------------------------------

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const RANGE_RE = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/;
const NAME_RE = /^[a-zA-Z0-9_-]+$/;
const SVC_RE = /^(tcp|udp|both)\/(\d{1,5}(-\d{1,5})?)$/;

function isValidIp(str) {
  if (!IP_RE.test(str)) return false;
  return str.split('.').every(o => {
    const n = Number(o);
    return n >= 0 && n <= 255;
  });
}

function isValidPort(str) {
  const n = Number(str);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

function isValidPortRange(str) {
  if (str.includes('-')) {
    const [a, b] = str.split('-');
    return isValidPort(a) && isValidPort(b) && Number(a) <= Number(b);
  }
  return isValidPort(str);
}

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

// --- NetworkObject ---------------------------------------------------------

/**
 * @param {import('./models.js').NetworkObject} obj
 * @param {import('./models.js').NetworkObject[]} [allObjects]
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validateNetworkObject(obj, allObjects = []) {
  const errors = {};

  // name
  if (isEmpty(obj.name)) {
    errors.name = 'Name is required.';
  } else if (!NAME_RE.test(obj.name)) {
    errors.name = 'Alphanumeric, hyphens, underscores only.';
  } else if (allObjects.some(o => o.name === obj.name && o.id !== obj.id)) {
    errors.name = 'Name must be unique.';
  }

  // value
  if (isEmpty(obj.value)) {
    errors.value = 'Value is required.';
  } else {
    switch (obj.type) {
      case 'host':
        if (!isValidIp(obj.value)) errors.value = 'Must be a valid IP address.';
        break;
      case 'subnet':
        if (!CIDR_RE.test(obj.value)) errors.value = 'Must be valid CIDR (e.g. 10.0.0.0/24).';
        break;
      case 'range':
        if (!RANGE_RE.test(obj.value)) errors.value = 'Must be IP-IP range.';
        break;
      case 'group':
        // comma-separated names; each must be non-empty
        {
          const names = obj.value.split(',').map(s => s.trim()).filter(Boolean);
          if (names.length === 0) {
            errors.value = 'At least one member name required.';
          } else if (!names.every(n => NAME_RE.test(n))) {
            errors.value = 'Each member must be alphanumeric/hyphens/underscores.';
          }
        }
        break;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// --- VipNat ----------------------------------------------------------------

/**
 * @param {import('./models.js').VipNat} vip
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validateVipNat(vip) {
  const errors = {};

  if (isEmpty(vip.name)) {
    errors.name = 'Name is required.';
  } else if (!NAME_RE.test(vip.name)) {
    errors.name = 'Alphanumeric, hyphens, underscores only.';
  }

  if (isEmpty(vip.externalIp)) {
    errors.externalIp = 'External IP is required.';
  } else if (!isValidIp(vip.externalIp)) {
    errors.externalIp = 'Must be a valid IP.';
  }

  if (isEmpty(vip.externalPort)) {
    errors.externalPort = 'External port is required.';
  } else if (!isValidPortRange(vip.externalPort)) {
    errors.externalPort = 'Must be 1-65535 or range.';
  }

  if (isEmpty(vip.mappedIp)) {
    errors.mappedIp = 'Mapped IP is required.';
  } else if (!isValidIp(vip.mappedIp)) {
    errors.mappedIp = 'Must be a valid IP.';
  }

  if (isEmpty(vip.mappedPort)) {
    errors.mappedPort = 'Mapped port is required.';
  } else if (!isValidPortRange(vip.mappedPort)) {
    errors.mappedPort = 'Must be 1-65535 or range.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// --- FirewallRule ----------------------------------------------------------

/**
 * @param {import('./models.js').FirewallRule} rule
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validateFirewallRule(rule) {
  const errors = {};

  if (isEmpty(rule.name)) {
    errors.name = 'Name is required.';
  } else if (!NAME_RE.test(rule.name)) {
    errors.name = 'Alphanumeric, hyphens, underscores only.';
  }

  if (isEmpty(rule.source)) {
    errors.source = 'At least one source required.';
  }

  if (isEmpty(rule.destination)) {
    errors.destination = 'At least one destination required.';
  }

  if (isEmpty(rule.service)) {
    errors.service = 'At least one service required.';
  } else {
    const bad = rule.service.filter(s => !SVC_RE.test(s));
    if (bad.length > 0) {
      errors.service = `Invalid service(s): ${bad.join(', ')}. Use tcp/PORT or udp/PORT.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Map entity type → validator */
export const validators = {
  objects: validateNetworkObject,
  vips: validateVipNat,
  rules: validateFirewallRule,
};
