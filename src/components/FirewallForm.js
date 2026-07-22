/**
 * FirewallForm — form component for adding/editing FirewallRules.
 * Source, destination, and service are comma-separated lists.
 */

import { store } from '../core/store.js';
import { createFirewallRule } from '../core/models.js';
import { validateFirewallRule } from '../core/schema.js';

/**
 * Create the FirewallForm component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function createFirewallForm(container) {
  let editingId = null;
  let formState = createFirewallRule();

  function render() {
    const rules = store.getAll('rules');
    container.innerHTML = `
      <div class="form-card">
        <h3>${editingId ? 'Edit' : 'Add'} Firewall Rule</h3>
        <form id="fw-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="fw-name">Rule Name</label>
              <input type="text" id="fw-name" value="${escapeAttr(formState.name)}" placeholder="allow-web-https" required />
              <span class="error" id="err-fw-name"></span>
            </div>
            <div class="form-group">
              <label for="fw-source">Source <small>(comma-separated)</small></label>
              <input type="text" id="fw-source" value="${escapeAttr((formState.source || []).join(', '))}" placeholder="obj-ext-lb, 10.0.0.5" required />
              <span class="error" id="err-fw-source"></span>
            </div>
            <div class="form-group">
              <label for="fw-dest">Destination <small>(comma-separated)</small></label>
              <input type="text" id="fw-dest" value="${escapeAttr((formState.destination || []).join(', '))}" placeholder="srv-web-01, vip-web-https" required />
              <span class="error" id="err-fw-dest"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="fw-service">Service <small>(e.g. tcp/443, udp/53)</small></label>
              <input type="text" id="fw-service" value="${escapeAttr((formState.service || []).join(', '))}" placeholder="tcp/443, tcp/80" required />
              <span class="error" id="err-fw-service"></span>
            </div>
            <div class="form-group">
              <label for="fw-action">Action</label>
              <select id="fw-action">
                <option value="allow" ${formState.action === 'allow' ? 'selected' : ''}>Allow</option>
                <option value="deny" ${formState.action === 'deny' ? 'selected' : ''}>Deny</option>
              </select>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" id="fw-log" ${formState.log ? 'checked' : ''} />
                Enable Logging
              </label>
            </div>
            <div class="form-group">
              <label for="fw-schedule">Schedule</label>
              <input type="text" id="fw-schedule" value="${escapeAttr(formState.schedule)}" placeholder="Optional" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label for="fw-comment">Comment</label>
              <input type="text" id="fw-comment" value="${escapeAttr(formState.comment)}" placeholder="Optional comment" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${editingId ? 'Update' : 'Add'} Rule</button>
            ${editingId ? '<button type="button" class="btn btn-secondary" id="fw-cancel">Cancel</button>' : ''}
          </div>
        </form>
      </div>
      <div class="table-card">
        <h3>Firewall Rules (${rules.length})</h3>
        ${rules.length === 0 ? '<p class="empty">No firewall rules defined yet.</p>' : `
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Source</th><th>Destination</th><th>Service</th><th>Action</th><th>Log</th><th>Schedule</th><th>Comment</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rules.map(rule => `
              <tr>
                <td>${escapeHtml(rule.name)}</td>
                <td>${(rule.source || []).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join(' ')}</td>
                <td>${(rule.destination || []).map(d => `<span class="tag">${escapeHtml(d)}</span>`).join(' ')}</td>
                <td>${(rule.service || []).map(s => `<code>${escapeHtml(s)}</code>`).join(' ')}</td>
                <td><span class="badge badge-${rule.action}">${escapeHtml(rule.action)}</span></td>
                <td>${rule.log ? '✓' : ''}</td>
                <td>${escapeHtml(rule.schedule)}</td>
                <td>${escapeHtml(rule.comment)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-edit" data-id="${rule.id}">Edit</button>
                  <button class="btn btn-sm btn-danger" data-id="${rule.id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    `;
    bindEvents();
  }

  function bindEvents() {
    const form = container.querySelector('#fw-form');
    if (form) form.addEventListener('submit', handleSubmit);

    const cancelBtn = container.querySelector('#fw-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingId = null;
        formState = createFirewallRule();
        render();
      });
    }

    const fieldMap = {
      'fw-name': 'name', 'fw-source': '_sourceStr', 'fw-dest': '_destStr',
      'fw-service': '_serviceStr', 'fw-comment': 'comment', 'fw-schedule': 'schedule',
    };
    for (const [domId, stateKey] of Object.entries(fieldMap)) {
      const input = container.querySelector(`#${domId}`);
      if (input) {
        input.addEventListener('input', () => {
          if (stateKey === '_sourceStr' || stateKey === '_destStr' || stateKey === '_serviceStr') {
            // Just store raw string, parse on submit
            formState[stateKey] = input.value;
          } else {
            formState[stateKey] = input.value;
          }
        });
      }
    }

    const actionSelect = container.querySelector('#fw-action');
    if (actionSelect) {
      actionSelect.addEventListener('change', (e) => { formState.action = e.target.value; });
    }

    const logCheckbox = container.querySelector('#fw-log');
    if (logCheckbox) {
      logCheckbox.addEventListener('change', (e) => { formState.log = e.target.checked; });
    }

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const obj = store.get('rules', btn.dataset.id);
        if (obj) {
          editingId = btn.dataset.id;
          formState = { ...obj, _sourceStr: (obj.source || []).join(', '), _destStr: (obj.destination || []).join(', '), _serviceStr: (obj.service || []).join(', ') };
          render();
          container.querySelector('#fw-name')?.focus();
        }
      });
    });

    container.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this rule?')) store.remove('rules', btn.dataset.id);
      });
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const parseList = (raw) => raw.split(',').map(s => s.trim()).filter(Boolean);

    const sourceStr = container.querySelector('#fw-source')?.value || '';
    const destStr = container.querySelector('#fw-dest')?.value || '';
    const serviceStr = container.querySelector('#fw-service')?.value || '';

    formState.name = container.querySelector('#fw-name')?.value?.trim() || '';
    formState.source = parseList(sourceStr);
    formState.destination = parseList(destStr);
    formState.service = parseList(serviceStr);
    formState.action = container.querySelector('#fw-action')?.value || 'allow';
    formState.log = container.querySelector('#fw-log')?.checked || false;
    formState.schedule = container.querySelector('#fw-schedule')?.value?.trim() || '';
    formState.comment = container.querySelector('#fw-comment')?.value?.trim() || '';

    const { valid, errors } = validateFirewallRule(formState);

    // Clear errors
    for (const domId of ['name', 'source', 'dest', 'service']) {
      const errEl = container.querySelector(`#err-fw-${domId}`);
      if (errEl) errEl.textContent = '';
      const input = container.querySelector(`#fw-${domId}`);
      if (input) input.classList.remove('input-error');
    }

    if (!valid) {
      const fieldMap = { name: 'name', source: 'source', destination: 'dest', service: 'service' };
      for (const [key, msg] of Object.entries(errors)) {
        const domId = fieldMap[key] || key;
        const errEl = container.querySelector(`#err-fw-${domId}`);
        if (errEl) errEl.textContent = msg;
        const input = container.querySelector(`#fw-${domId}`);
        if (input) input.classList.add('input-error');
      }
      return;
    }

    if (editingId) {
      store.update('rules', editingId, { ...formState });
      editingId = null;
    } else {
      store.add('rules', createFirewallRule({ ...formState }));
    }
    formState = createFirewallRule();
    render();
  }

  const unsub = store.subscribe('rules', () => render());
  render();

  return { destroy() { unsub(); container.innerHTML = ''; } };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
