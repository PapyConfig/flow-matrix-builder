/**
 * MatrixTable — combined overview of all entities.
 * Shows firewall rules with resolved object names, plus standalone objects and VIPs.
 * Enhanced with CSS hover tooltips showing object details.
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
        ${rules.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state-icon">📊</span>
            <p>No firewall rules defined yet. Add rules in the Firewall Rules tab to see the matrix overview.</p>
            <p class="empty-state-action">Start by adding network objects, then VIPs, then firewall rules.</p>
          </div>` : `
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
                <td>${wrapWithTooltip(obj.name, buildObjectTooltip(obj), 'ref-obj')}</td>
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
                <td>${wrapWithTooltip(vip.name, buildVipTooltip(vip), 'ref-vip')}</td>
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
          <span class="empty-state-icon">📊</span>
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
        const tooltip = buildObjectTooltip(obj);
        return wrapWithTooltip(ref, tooltip, 'ref-obj');
      }
      if (vip) {
        const tooltip = buildVipTooltip(vip);
        return wrapWithTooltip(ref, tooltip, 'ref-vip');
      }
      return `<span class="ref ref-raw" title="Direct IP/value: ${escapeHtml(ref)}">${escapeHtml(ref)}</span>`;
    }).join(' ');
  }

  /**
   * Build tooltip text for a network object.
   * @param {object} obj
   * @returns {string}
   */
  function buildObjectTooltip(obj) {
    const parts = [`${obj.name}`, `→`, `${obj.type}: ${obj.value}`];
    if (obj.comment) parts.push(`(${obj.comment})`);
    return parts.join(' ');
  }

  /**
   * Build tooltip text for a VIP.
   * @param {object} vip
   * @returns {string}
   */
  function buildVipTooltip(vip) {
    const parts = [`${vip.name}`, `→`, `${vip.externalIp}:${vip.externalPort} → ${vip.mappedIp}:${vip.mappedPort}/${vip.protocol}`];
    if (vip.comment) parts.push(`(${vip.comment})`);
    return parts.join(' ');
  }

  /**
   * Wrap content in a CSS tooltip container.
   * @param {string} content - Visible text
   * @param {string} tooltip - Tooltip text
   * @param {string} [extraClass] - Extra CSS class for the visible span
   * @returns {string}
   */
  function wrapWithTooltip(content, tooltip, extraClass) {
    const cls = extraClass ? `ref ${extraClass}` : 'ref';
    return `<span class="tooltip-wrapper"><span class="${cls}">${escapeHtml(content)}</span><span class="tooltip-content">${escapeHtml(tooltip)}</span></span>`;
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
