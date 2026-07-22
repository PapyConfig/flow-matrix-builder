/**
 * ObjectForm — form component for adding/editing NetworkObjects.
 * Renders into a given container and manages its own DOM.
 * Enhanced with auto-naming, inline validation, and confirm dialogs.
 */

import { store } from '../core/store.js';
import { createNetworkObject } from '../core/models.js';
import { validateNetworkObject } from '../core/schema.js';
import { generateAutoName, loadNamingSettings } from '../core/naming.js';

/**
 * Create the ObjectForm component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function createObjectForm(container) {
  let editingId = null;
  let formState = createNetworkObject();

  function render() {
    const objects = store.getAll('objects');
    const namingSettings = loadNamingSettings();

    // Auto-generate name if enabled and not editing
    let nameValue = formState.name;
    if (!editingId && namingSettings.enabled && !formState.name) {
      // Don't auto-fill until user types something — we'll update on type change
      nameValue = '';
    }

    container.innerHTML = `
      <div class="form-card">
        <h3>${editingId ? 'Edit' : 'Add'} Network Object</h3>
        <form id="obj-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="obj-name">Name${namingSettings.enabled ? ' <small>(auto-named)</small>' : ''}</label>
              <input type="text" id="obj-name" value="${escapeAttr(nameValue)}" placeholder="srv-web-01" required />
              <span class="error" id="err-obj-name"></span>
            </div>
            <div class="form-group">
              <label for="obj-type">Type</label>
              <select id="obj-type">
                <option value="host" ${formState.type === 'host' ? 'selected' : ''}>Host</option>
                <option value="range" ${formState.type === 'range' ? 'selected' : ''}>Range</option>
                <option value="subnet" ${formState.type === 'subnet' ? 'selected' : ''}>Subnet</option>
                <option value="group" ${formState.type === 'group' ? 'selected' : ''}>Group</option>
              </select>
            </div>
            <div class="form-group">
              <label for="obj-value">Value</label>
              <input type="text" id="obj-value" value="${escapeAttr(formState.value)}" placeholder="${getPlaceholder(formState.type)}" required />
              <span class="error" id="err-obj-value"></span>
            </div>
            <div class="form-group">
              <label for="obj-comment">Comment</label>
              <input type="text" id="obj-comment" value="${escapeAttr(formState.comment)}" placeholder="Optional comment" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${editingId ? 'Update' : 'Add'} Object</button>
            ${editingId ? '<button type="button" class="btn btn-secondary" id="obj-cancel">Cancel</button>' : ''}
          </div>
        </form>
      </div>
      <div class="table-card">
        <h3>Network Objects (${objects.length})</h3>
        ${objects.length === 0 ? `
          <div class="empty-state">
            <span class="empty-state-icon">📦</span>
            <p>No network objects defined yet. Add hosts, subnets, ranges, or groups to get started.</p>
            <p class="empty-state-action">Use the form above to create your first object.</p>
          </div>` : `
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Value</th><th>Comment</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${objects.map(obj => `
              <tr>
                <td>${escapeHtml(obj.name)}</td>
                <td><span class="badge">${escapeHtml(obj.type)}</span></td>
                <td><code>${escapeHtml(obj.value)}</code></td>
                <td>${escapeHtml(obj.comment)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-edit" data-id="${obj.id}" title="Edit">Edit</button>
                  <button class="btn btn-sm btn-danger" data-id="${obj.id}" title="Delete">Delete</button>
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
    const form = container.querySelector('#obj-form');
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    const cancelBtn = container.querySelector('#obj-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingId = null;
        formState = createNetworkObject();
        render();
      });
    }

    const typeSelect = container.querySelector('#obj-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        formState.type = e.target.value;
        const valueInput = container.querySelector('#obj-value');
        if (valueInput) valueInput.placeholder = getPlaceholder(formState.type);

        // Auto-update name prefix if auto-naming enabled and not editing
        const namingSettings = loadNamingSettings();
        if (namingSettings.enabled && !editingId) {
          const nameInput = container.querySelector('#obj-name');
          if (nameInput && !nameInput.dataset.userModified) {
            // Only update if user hasn't manually changed the name
          }
        }
      });
    }

    // Sync inputs to state with inline validation
    for (const field of ['name', 'value', 'comment']) {
      const input = container.querySelector(`#obj-${field}`);
      if (input) {
        input.addEventListener('input', () => {
          formState[field] = input.value;
          // Mark name as user-modified to prevent auto-overwrite
          if (field === 'name') {
            input.dataset.userModified = 'true';
          }
          // Inline validation on input
          if (field === 'name' || field === 'value') {
            validateField(field, input.value);
          }
        });
      }
    }

    // Edit buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const obj = store.get('objects', id);
        if (obj) {
          editingId = id;
          formState = { ...obj };
          render();
          container.querySelector('#obj-name')?.focus();
        }
      });
    });

    // Delete buttons with custom confirm
    container.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const obj = store.get('objects', id);
        const name = obj ? obj.name : 'this object';
        if (confirm(`Delete "${name}"? This cannot be undone.`)) {
          store.remove('objects', id);
        }
      });
    });
  }

  function validateField(field, value) {
    const allObjects = store.getAll('objects');
    const errEl = container.querySelector(`#err-obj-${field}`);
    const input = container.querySelector(`#obj-${field}`);
    if (!errEl || !input) return;

    // Create a temp object to validate just this field
    const tempObj = { ...formState, [field]: value };
    const { errors } = validateNetworkObject(tempObj, allObjects);

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
    // Sync all fields from DOM
    formState.name = container.querySelector('#obj-name')?.value?.trim() || '';
    formState.value = container.querySelector('#obj-value')?.value?.trim() || '';
    formState.comment = container.querySelector('#obj-comment')?.value?.trim() || '';
    formState.type = container.querySelector('#obj-type')?.value || 'host';

    const allObjects = store.getAll('objects');
    const { valid, errors } = validateNetworkObject(formState, allObjects);

    // Clear all errors
    for (const key of ['name', 'value']) {
      const errEl = container.querySelector(`#err-obj-${key}`);
      if (errEl) errEl.textContent = '';
      const input = container.querySelector(`#obj-${key}`);
      if (input) input.classList.remove('input-error');
    }

    if (!valid) {
      for (const [key, msg] of Object.entries(errors)) {
        const errEl = container.querySelector(`#err-obj-${key}`);
        if (errEl) errEl.textContent = msg;
        const input = container.querySelector(`#obj-${key}`);
        if (input) input.classList.add('input-error');
      }
      return;
    }

    if (editingId) {
      store.update('objects', editingId, { ...formState });
      editingId = null;
    } else {
      // Apply auto-naming if enabled
      const namingSettings = loadNamingSettings();
      if (namingSettings.enabled) {
        const autoName = generateAutoName(formState.type, formState.name);
        formState.name = autoName;
      }
      store.add('objects', createNetworkObject({ ...formState }));
    }
    formState = createNetworkObject();
    render();
  }

  const unsub = store.subscribe('objects', () => render());
  render();

  return {
    destroy() {
      unsub();
      container.innerHTML = '';
    },
  };
}

function getPlaceholder(type) {
  switch (type) {
    case 'host': return '192.168.1.1';
    case 'subnet': return '10.0.0.0/24';
    case 'range': return '192.168.1.1-192.168.1.10';
    case 'group': return 'obj-a, obj-b, obj-c';
    default: return '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
