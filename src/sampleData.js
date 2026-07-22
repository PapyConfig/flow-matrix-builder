/**
 * Sample data for testing and demo purposes.
 * Call loadSampleData() to populate the store.
 */

import { store } from './core/store.js';
import { createNetworkObject, createVipNat, createFirewallRule } from './core/models.js';

export function loadSampleData() {
  // Network Objects
  const objs = [
    createNetworkObject({ name: 'srv-web-01', type: 'host', value: '10.0.1.10', comment: 'Web server 1' }),
    createNetworkObject({ name: 'srv-web-02', type: 'host', value: '10.0.1.11', comment: 'Web server 2' }),
    createNetworkObject({ name: 'srv-db-01', type: 'host', value: '10.0.2.10', comment: 'Database server' }),
    createNetworkObject({ name: 'net-dmz', type: 'subnet', value: '10.0.1.0/24', comment: 'DMZ network' }),
    createNetworkObject({ name: 'net-internal', type: 'subnet', value: '10.0.2.0/24', comment: 'Internal network' }),
    createNetworkObject({ name: 'ext-lb-pool', type: 'range', value: '203.0.113.10-203.0.113.20', comment: 'External LB pool' }),
    createNetworkObject({ name: 'grp-web-servers', type: 'group', value: 'srv-web-01, srv-web-02', comment: 'All web servers' }),
  ];
  for (const obj of objs) store.add('objects', obj);

  // VIP/NAT Rules
  const vips = [
    createVipNat({ name: 'vip-web-https', externalIp: '203.0.113.1', externalPort: '443', mappedIp: '10.0.1.10', mappedPort: '8443', protocol: 'tcp', comment: 'HTTPS VIP' }),
    createVipNat({ name: 'vip-web-http', externalIp: '203.0.113.1', externalPort: '80', mappedIp: '10.0.1.10', mappedPort: '8080', protocol: 'tcp', comment: 'HTTP VIP' }),
    createVipNat({ name: 'vip-db-mysql', externalIp: '203.0.113.2', externalPort: '3306', mappedIp: '10.0.2.10', mappedPort: '3306', protocol: 'tcp', comment: 'MySQL VIP' }),
  ];
  for (const vip of vips) store.add('vips', vip);

  // Firewall Rules
  const rules = [
    createFirewallRule({
      name: 'allow-ext-https',
      source: ['ext-lb-pool'],
      destination: ['vip-web-https'],
      service: ['tcp/443'],
      action: 'allow',
      log: true,
      comment: 'Allow external HTTPS to web VIP',
    }),
    createFirewallRule({
      name: 'allow-ext-http',
      source: ['ext-lb-pool'],
      destination: ['vip-web-http'],
      service: ['tcp/80'],
      action: 'allow',
      log: true,
      comment: 'Allow external HTTP to web VIP',
    }),
    createFirewallRule({
      name: 'allow-web-to-db',
      source: ['grp-web-servers'],
      destination: ['srv-db-01'],
      service: ['tcp/3306'],
      action: 'allow',
      log: true,
      comment: 'Allow web servers to reach database',
    }),
    createFirewallRule({
      name: 'deny-all-internal',
      source: ['net-internal'],
      destination: ['net-dmz'],
      service: ['tcp/1-65535', 'udp/1-65535'],
      action: 'deny',
      log: true,
      comment: 'Deny all internal to DMZ by default',
    }),
  ];
  for (const rule of rules) store.add('rules', rule);
}
