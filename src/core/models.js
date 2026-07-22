/**
 * Data model factories for Flow Matrix entities.
 * Each factory returns a plain object with defaults merged over provided fields.
 */

import { generateId } from './id.js';

/**
 * @typedef {Object} NetworkObject
 * @property {string} id
 * @property {string} name
 * @property {"host"|"range"|"subnet"|"group"} type
 * @property {string} value
 * @property {string} comment
 */

/**
 * @param {Partial<NetworkObject>} [fields]
 * @returns {NetworkObject}
 */
export function createNetworkObject(fields = {}) {
  return {
    id: generateId('obj'),
    name: '',
    type: 'host',
    value: '',
    comment: '',
    ...fields,
  };
}

/**
 * @typedef {Object} VipNat
 * @property {string} id
 * @property {string} name
 * @property {string} externalIp
 * @property {string} externalPort
 * @property {string} mappedIp
 * @property {string} mappedPort
 * @property {"tcp"|"udp"|"both"} protocol
 * @property {string} comment
 */

/**
 * @param {Partial<VipNat>} [fields]
 * @returns {VipNat}
 */
export function createVipNat(fields = {}) {
  return {
    id: generateId('vip'),
    name: '',
    externalIp: '',
    externalPort: '',
    mappedIp: '',
    mappedPort: '',
    protocol: 'tcp',
    comment: '',
    ...fields,
  };
}

/**
 * @typedef {Object} FirewallRule
 * @property {string} id
 * @property {string} name
 * @property {string[]} source
 * @property {string[]} destination
 * @property {string[]} service
 * @property {"allow"|"deny"} action
 * @property {boolean} log
 * @property {string} schedule
 * @property {string} comment
 */

/**
 * @param {Partial<FirewallRule>} [fields]
 * @returns {FirewallRule}
 */
export function createFirewallRule(fields = {}) {
  return {
    id: generateId('fw'),
    name: '',
    source: [],
    destination: [],
    service: [],
    action: 'allow',
    log: false,
    schedule: '',
    comment: '',
    ...fields,
  };
}

/** Map of entity type key → factory function */
export const factories = {
  objects: createNetworkObject,
  vips: createVipNat,
  rules: createFirewallRule,
};
