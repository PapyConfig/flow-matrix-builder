/**
 * CSV exporter for Flow Matrix data.
 * Generates a flat CSV with one row per firewall rule,
 * plus standalone rows for unreferenced objects and VIPs.
 */

import { registry } from './registry.js';

const COLUMNS = [
  'Rule_Name', 'Source', 'Destination', 'Service', 'Action', 'Log', 'Schedule', 'Comment',
  'VIP_Name', 'VIP_External_IP', 'VIP_External_Port', 'VIP_Mapped_IP', 'VIP_Mapped_Port', 'VIP_Protocol',
  'Object_Name', 'Object_Type', 'Object_Value', 'Object_Comment',
];

/**
 * Escape a CSV field (quote if it contains comma, quote, or newline).
 * @param {string} val
 * @returns {string}
 */
function esc(val) {
  if (val === null || val === undefined) val = '';
  val = String(val);
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

/**
 * Generate CSV string from store data.
 * @param {{ objects: object[], vips: object[], rules: object[] }} data
 * @returns {string}
 */
function generateCsv(data) {
  const { objects = [], vips = [], rules = [] } = data;

  const rows = [COLUMNS.join(',')];

  // Track which objects and VIPs are referenced by rules
  const referencedObjects = new Set();
  const referencedVips = new Set();

  // Collect all names referenced in source/destination
  for (const rule of rules) {
    for (const s of (rule.source || [])) {
      referencedObjects.add(s);
    }
    for (const d of (rule.destination || [])) {
      referencedObjects.add(d);
    }
  }

  // Match VIPs by checking if any rule references the VIP's mapped IP or name
  for (const vip of vips) {
    // VIP is referenced if any rule source/destination contains its name or mappedIp
    const vipName = vip.name;
    const vipMapped = vip.mappedIp;
    for (const rule of rules) {
      const allRefs = [...(rule.source || []), ...(rule.destination || [])];
      if (allRefs.includes(vipName) || allRefs.includes(vipMapped)) {
        referencedVips.add(vip.id);
        break;
      }
    }
  }

  // One row per firewall rule
  for (const rule of rules) {
    const baseRow = [
      esc(rule.name),
      esc((rule.source || []).join('; ')),
      esc((rule.destination || []).join('; ')),
      esc((rule.service || []).join('; ')),
      esc(rule.action),
      esc(rule.log ? 'yes' : 'no'),
      esc(rule.schedule || ''),
      esc(rule.comment || ''),
    ];

    // Find related VIPs (name match in source/destination)
    const relatedVips = vips.filter(vip => {
      const allRefs = [...(rule.source || []), ...(rule.destination || [])];
      return allRefs.includes(vip.name) || allRefs.includes(vip.mappedIp);
    });

    if (relatedVips.length > 0) {
      for (const vip of relatedVips) {
        const vipCols = [
          esc(vip.name), esc(vip.externalIp), esc(vip.externalPort),
          esc(vip.mappedIp), esc(vip.mappedPort), esc(vip.protocol),
        ];
        // Find related objects
        const relatedObjs = objects.filter(obj =>
          [...(rule.source || []), ...(rule.destination || [])].includes(obj.name)
        );
        if (relatedObjs.length > 0) {
          for (const obj of relatedObjs) {
            const objCols = [esc(obj.name), esc(obj.type), esc(obj.value), esc(obj.comment || '')];
            rows.push([...baseRow, ...vipCols, ...objCols].join(','));
          }
        } else {
          rows.push([...baseRow, ...vipCols, ...['', '', '', '']].join(','));
        }
      }
    } else {
      const emptyVipCols = ['', '', '', '', '', ''];
      // Find related objects
      const relatedObjs = objects.filter(obj =>
        [...(rule.source || []), ...(rule.destination || [])].includes(obj.name)
      );
      if (relatedObjs.length > 0) {
        for (const obj of relatedObjs) {
          const objCols = [esc(obj.name), esc(obj.type), esc(obj.value), esc(obj.comment || '')];
          rows.push([...baseRow, ...emptyVipCols, ...objCols].join(','));
        }
      } else {
        rows.push([...baseRow, ...emptyVipCols, ...['', '', '', '']].join(','));
      }
    }
  }

  // Unreferenced objects get their own rows
  for (const obj of objects) {
    if (!referencedObjects.has(obj.name)) {
      const emptyRuleCols = ['', '', '', '', '', '', '', ''];
      const emptyVipCols = ['', '', '', '', '', ''];
      const objCols = [esc(obj.name), esc(obj.type), esc(obj.value), esc(obj.comment || '')];
      rows.push([...emptyRuleCols, ...emptyVipCols, ...objCols].join(','));
    }
  }

  // Unreferenced VIPs get their own rows
  for (const vip of vips) {
    if (!referencedVips.has(vip.id)) {
      const emptyRuleCols = ['', '', '', '', '', '', '', ''];
      const vipCols = [
        esc(vip.name), esc(vip.externalIp), esc(vip.externalPort),
        esc(vip.mappedIp), esc(vip.mappedPort), esc(vip.protocol),
      ];
      const emptyObjCols = ['', '', '', ''];
      rows.push([...emptyRuleCols, ...vipCols, ...emptyObjCols].join(','));
    }
  }

  return rows.join('\n');
}

// Self-register
registry.register('csv', {
  label: 'Export CSV',
  generate: generateCsv,
  fileExtension: 'csv',
});

export { generateCsv };
