/**
 * MatrixTable — combined overview of all entities.
 * Shows firewall rules with resolved object names, plus standalone objects and VIPs.
 */

import { store } from '../core/store.js';

/**
 * Create the MatrixTable component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function createMatrixTable(container) {
  function render() {
    const objects = store.getAll('objects');
    const vips = store.getAll('vips');
    const rules = store.getAll('rules');

    // Build lookup maps
    const objByName = new Map(objects.map(o => [o.name, o]));
    const vipByName = new Map(vips.map(v => [v.name, v]));

    // Track which objects and VIPs are referenced
    const refObjects = new Set();
    const refVips = new Set();

    for (const rule of rules) {
      for (const s of (rule.source || [])) {
        if (objByName.has(s)) refObjects.add(s);
        if (vipByName.has(s)) refVips.add(s);
      }
      for (const d of (rule.destination || [])) {
        if (objByName.has(d)) refObjects.add(d);
        if (vipByName.has(d)) refVips.add(d);
      }
    }

    const unreferencedObjs = objects.filter(o => !refObjects.has(o.name));
    const unreferencedVips = vips.filter(v => !refVips.has(v.name));

    container.innerHTML = `
      <div class="matrix-section">
        <h3>Firewall Rules Matrix (${rules.length})</h3>
        ${rules.length === 0 ? '<p class="empty">No firewall rules defined yet. Add rules in the Firewall tab.</p>' : `
        <div class="table-scroll">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Source(s)</th>
                <th>Destination(s)</th>
                <th>Service(s)</th>
                <th>Action</th>
                <th>Log</th>
                <th>Schedule</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              ${rules.map(rule => `
                <tr>
                  <td><strong>${escapeHtml(rule.name)}</strong></td>
                  <td>${resolveRefs(rule.source, objByName, vipByName)}</td>
                  <td>${resolveRefs(rule.destination, objByName, vipByName)}</td>
                  <td>${(rule.service || []).map(s => `<code class="svc">${escapeHtml(s)}</code>`).join(' ')}</td>
                  <td><span class="badge badge-${rule.action}">${escapeHtml(rule.action)}</span></td>
                  <td>${rule.log ? '<span class="log-on">ON</span>' : '<span class="log-off">OFF</span>'}</td>
                  <td>${escapeHtml(rule.schedule) || '<span class="muted">-</span>'}</td>
                  <td>${escapeHtml(rule.comment) || '<span class="muted">-</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      ${unreferencedObjs.length > 0 ? `
      <div class="matrix-section">
        <h3>Unreferenced Network Objects (${unreferencedObjs.length})</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Value</th><th>Comment</th></tr>
          </thead>
          <tbody>
            ${unreferencedObjs.map(obj => `
              <tr>
                <td>${escapeHtml(obj.name)}</td>
                <td><span class="badge">${escapeHtml(obj.type)}</span></td>
                <td><code>${escapeHtml(obj.value)}</code></td>
                <td>${escapeHtml(obj.comment) || '<span class="muted">-</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${unreferencedVips.length > 0 ? `
      <div class="matrix-section">
        <h3>Unreferenced VIPs (${unreferencedVips.length})</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Ext IP</th><th>Ext Port</th><th>Mapped IP</th><th>Mapped Port</th><th>Proto</th><th>Comment</th></tr>
          </thead>
          <tbody>
            ${unreferencedVips.map(vip => `
              <tr>
                <td>${escapeHtml(vip.name)}</td>
                <td><code>${escapeHtml(vip.externalIp)}</code></td>
                <td>${escapeHtml(vip.externalPort)}</td>
                <td><code>${escapeHtml(vip.mappedIp)}</code></td>
                <td>${escapeHtml(vip.mappedPort)}</td>
                <td><span class="badge">${escapeHtml(vip.protocol)}</span></td>
                <td>${escapeHtml(vip.comment) || '<span class="muted">-</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${rules.length === 0 && unreferencedObjs.length === 0 && unreferencedVips.length === 0 ? `
        <div class="empty-state">
          <p>No data yet. Use the other tabs to add network objects, VIPs, and firewall rules.</p>
        </div>` : ''}
    `;
  }

  function resolveRefs(refs, objMap, vipMap) {
    if (!refs || refs.length === 0) return '<span class="muted">-</span>';
    return refs.map(ref => {
      const obj = objMap.get(ref);
      const vip = vipMap.get(ref);
      if (obj) {
        return `<span class="ref ref-obj" title="${escapeHtml(obj.type)}: ${escapeHtml(obj.value)}">${escapeHtml(ref)}</span>`;
      }
      if (vip) {
        return `<span class="ref ref-vip" title="${escapeHtml(vip.externalIp)}:${escapeHtml(vip.externalPort)} → ${escapeHtml(vip.mappedIp)}:${escapeHtml(vip.mappedPort)}">${escapeHtml(ref)}</span>`;
      }
      return `<span class="ref ref-raw" title="Direct IP/value">${escapeHtml(ref)}</span>`;
    }).join(' ');
  }

  const unsub1 = store.subscribe('objects', () => render());
  const unsub2 = store.subscribe('vips', () => render());
  const unsub3 = store.subscribe('rules', () => render());
  render();

  return {
    destroy() {
      unsub1(); unsub2(); unsub3();
      container.innerHTML = '';
    },
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
