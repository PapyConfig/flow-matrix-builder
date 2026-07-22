/**
 * FirewallForm — form component for adding/editing FirewallRules.
 * Enhanced with autocomplete tag inputs, auto-naming, inline validation.
 */

import { store } from '../core/store.js';
import { createFirewallRule } from '../core/models.js';
import { validateFirewallRule } from '../core/schema.js';
import { generateAutoName, loadNamingSettings } from '../core/naming.js';
import { createTagInput } from './TagInput.js';

/**
 * Create the FirewallForm component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function createFirewallForm(container) {
  let editingId = null;
  let formState = createFirewallRule();
  let tagInputs = [];

  function render() {
    const rules = store.getAll('rules');
    const namingSettings = loadNamingSettings();

    container.innerHTML = `
      <div class="form-card">
        <h3>${editingId ? 'Edit' : 'Add'} Firewall Rule</h3>
        <form id="fw-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="fw-name">Rule Name${namingSettings.enabled ? ' <small>(auto-named)</small>' : ''}</label>
              <input type="text" id="fw-name" value="${escapeAttr(formState.name)}" placeholder="allow-web-https" required />
              <span class="error" id="err-fw-name"></span>
            </div>
            <div class="form-group">
              <label for="fw-source">Source <small>(search or type free-form)</small></label>
              <input type="text" id="fw-source" value="${escapeAttr((formState.source || []).join(', '))}" placeholder="Search objects or type IPs..." required />
              <span class="error" id="err-fw-source"></span>
            </div>
            <div class="form-group">
              <label for="fw-dest">Destination <small>(search or type free-form)</small></label>
              <input type="text" id="fw-dest" value="${escapeAttr((formState.destination || []).join(', '))}" placeholder="Search objects or type IPs..." required />
              <span class="error" id="err-fw-dest"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="fw-service">Service <small>(e.g. tcp/443, udp/53)</small></label>
              <input type="text" id="fw-service" value="${escapeAttr((formState.service || []).join(', '))}" placeholder="tcp/443, udp/53" required />
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
        ${rules.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state-icon">🔥</span>
            <p>No firewall rules defined yet. Rules define what traffic is allowed or denied between your network objects.</p>
            <p class="empty-state-action">First add network objects and VIPs, then create rules here.</p>
          </div>` : `
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
    initTagInputs();
  }

  function initTagInputs() {
    // Destroy previous tag inputs
    tagInputs.forEach(ti => ti.destroy());
    tagInputs = [];

    const srcGroup = container.querySelector('#fw-source')?.closest('.form-group');
    const dstGroup = container.querySelector('#fw-dest')?.closest('.form-group');
    const svcGroup = container.querySelector('#fw-service')?.closest('.form-group');

    if (srcGroup) {
      tagInputs.push(createTagInput(srcGroup, {
        inputId: 'fw-source',
        initialValues: formState.source || [],
        searchType: 'object',
        onChange: (vals) => { formState.source = vals; },
      }));
    }

    if (dstGroup) {
      tagInputs.push(createTagInput(dstGroup, {
        inputId: 'fw-dest',
        initialValues: formState.destination || [],
        searchType: 'vip',
        onChange: (vals) => { formState.destination = vals; },
      }));
    }

    if (svcGroup) {
      tagInputs.push(createTagInput(svcGroup, {
        inputId: 'fw-service',
        initialValues: formState.service || [],
        searchType: 'service',
        onChange: (vals) => { formState.service = vals; },
      }));
    }
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

    // Sync non-tag inputs
    const nameInput = container.querySelector('#fw-name');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        formState.name = nameInput.value;
        validateField('name', nameInput.value);
      });
    }

    const commentInput = container.querySelector('#fw-comment');
    if (commentInput) {
      commentInput.addEventListener('input', () => { formState.comment = commentInput.value; });
    }

    const scheduleInput = container.querySelector('#fw-schedule');
    if (scheduleInput) {
      scheduleInput.addEventListener('input', () => { formState.schedule = scheduleInput.value; });
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
          formState = { ...obj };
          render();
          container.querySelector('#fw-name')?.focus();
        }
      });
    });

    container.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rule = store.get('rules', btn.dataset.id);
        const name = rule ? rule.name : 'this rule';
        if (confirm(`Delete rule "${name}"? This cannot be undone.`)) {
          store.remove('rules', btn.dataset.id);
        }
      });
    });
  }

  function validateField(field, value) {
    const errEl = container.querySelector(`#err-fw-${field}`);
    const input = container.querySelector(`#fw-${field}`);
    if (!errEl || !input) return;

    const tempRule = { ...formState, [field]: value };
    const { errors } = validateFirewallRule(tempRule);

    if (errors[field]) {
      errEl.textContent = errors[field];
      input.classList.add('input-error');
      input.classList.remove('input-valid');
    } else {
      errEl.textContent = '';
      input.classList.remove('input-error');
      if (value.trim()) {
        input.classList.add('input-valid');
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    // Get values from tag inputs
    tagInputs.forEach(ti => {
      // Values already synced via onChange
    });

    formState.name = container.querySelector('#fw-name')?.value?.trim() || '';
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

    // Also clear tag-input error states
    container.querySelectorAll('.tag-input-wrapper').forEach(w => w.classList.remove('has-error'));

    if (!valid) {
      const fieldMap = { name: 'name', source: 'source', destination: 'dest', service: 'service' };
      for (const [key, msg] of Object.entries(errors)) {
        const domId = fieldMap[key] || key;
        const errEl = container.querySelector(`#err-fw-${domId}`);
        if (errEl) errEl.textContent = msg;
        const input = container.querySelector(`#fw-${domId}`);
        if (input) input.classList.add('input-error');
        // Mark tag-input wrapper if present
        const wrapper = container.querySelector(`#fw-${domId}`)?.closest('.form-group')?.querySelector('.tag-input-wrapper');
        if (wrapper) wrapper.classList.add('has-error');
      }
      return;
    }

    if (editingId) {
      store.update('rules', editingId, { ...formState });
      editingId = null;
    } else {
      // Apply auto-naming if enabled
      const namingSettings = loadNamingSettings();
      if (namingSettings.enabled) {
        const autoName = generateAutoName('fw', formState.name, formState.action);
        formState.name = autoName;
      }
      store.add('rules', createFirewallRule({ ...formState }));
    }
    formState = createFirewallRule();
    render();
  }

  // Destroy tag inputs on cleanup
  const origDestroy = () => {
    tagInputs.forEach(ti => ti.destroy());
    tagInputs = [];
  };

  const unsub = store.subscribe('rules', () => render());
  render();

  return {
    destroy() {
      unsub();
      origDestroy();
      container.innerHTML = '';
    },
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
