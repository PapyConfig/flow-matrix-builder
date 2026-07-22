/**
 * VipForm — form component for adding/editing VIP/NAT entries.
 */

import { store } from '../core/store.js';
import { createVipNat } from '../core/models.js';
import { validateVipNat } from '../core/schema.js';

/**
 * Create the VipForm component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function createVipForm(container) {
  let editingId = null;
  let formState = createVipNat();

  function render() {
    const vips = store.getAll('vips');
    container.innerHTML = `
      <div class="form-card">
        <h3>${editingId ? 'Edit' : 'Add'} VIP / NAT Rule</h3>
        <form id="vip-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="vip-name">Name</label>
              <input type="text" id="vip-name" value="${escapeAttr(formState.name)}" placeholder="vip-web-https" required />
              <span class="error" id="err-vip-name"></span>
            </div>
            <div class="form-group">
              <label for="vip-extip">External IP</label>
              <input type="text" id="vip-extip" value="${escapeAttr(formState.externalIp)}" placeholder="203.0.113.1" required />
              <span class="error" id="err-vip-extip"></span>
            </div>
            <div class="form-group">
              <label for="vip-extport">External Port</label>
              <input type="text" id="vip-extport" value="${escapeAttr(formState.externalPort)}" placeholder="443" required />
              <span class="error" id="err-vip-extport"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="vip-mappedip">Mapped IP</label>
              <input type="text" id="vip-mappedip" value="${escapeAttr(formState.mappedIp)}" placeholder="10.0.0.5" required />
              <span class="error" id="err-vip-mappedip"></span>
            </div>
            <div class="form-group">
              <label for="vip-mappedport">Mapped Port</label>
              <input type="text" id="vip-mappedport" value="${escapeAttr(formState.mappedPort)}" placeholder="8443" required />
              <span class="error" id="err-vip-mappedport"></span>
            </div>
            <div class="form-group">
              <label for="vip-protocol">Protocol</label>
              <select id="vip-protocol">
                <option value="tcp" ${formState.protocol === 'tcp' ? 'selected' : ''}>TCP</option>
                <option value="udp" ${formState.protocol === 'udp' ? 'selected' : ''}>UDP</option>
                <option value="both" ${formState.protocol === 'both' ? 'selected' : ''}>Both</option>
              </select>
            </div>
            <div class="form-group">
              <label for="vip-comment">Comment</label>
              <input type="text" id="vip-comment" value="${escapeAttr(formState.comment)}" placeholder="Optional comment" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${editingId ? 'Update' : 'Add'} VIP</button>
            ${editingId ? '<button type="button" class="btn btn-secondary" id="vip-cancel">Cancel</button>' : ''}
          </div>
        </form>
      </div>
      <div class="table-card">
        <h3>VIP / NAT Rules (${vips.length})</h3>
        ${vips.length === 0 ? '<p class="empty">No VIPs defined yet.</p>' : `
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Ext IP</th><th>Ext Port</th><th>Mapped IP</th><th>Mapped Port</th><th>Proto</th><th>Comment</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${vips.map(vip => `
              <tr>
                <td>${escapeHtml(vip.name)}</td>
                <td><code>${escapeHtml(vip.externalIp)}</code></td>
                <td>${escapeHtml(vip.externalPort)}</td>
                <td><code>${escapeHtml(vip.mappedIp)}</code></td>
                <td>${escapeHtml(vip.mappedPort)}</td>
                <td><span class="badge">${escapeHtml(vip.protocol)}</span></td>
                <td>${escapeHtml(vip.comment)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-edit" data-id="${vip.id}">Edit</button>
                  <button class="btn btn-sm btn-danger" data-id="${vip.id}">Delete</button>
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
    const form = container.querySelector('#vip-form');
    if (form) form.addEventListener('submit', handleSubmit);

    const cancelBtn = container.querySelector('#vip-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingId = null;
        formState = createVipNat();
        render();
      });
    }

    const fields = ['name', 'externalIp', 'externalPort', 'mappedIp', 'mappedPort', 'comment'];
    const domIds = ['name', 'extip', 'extport', 'mappedip', 'mappedport', 'comment'];
    fields.forEach((field, i) => {
      const input = container.querySelector(`#vip-${domIds[i]}`);
      if (input) {
        input.addEventListener('input', () => { formState[field] = input.value; });
      }
    });

    const protoSelect = container.querySelector('#vip-protocol');
    if (protoSelect) {
      protoSelect.addEventListener('change', (e) => { formState.protocol = e.target.value; });
    }

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const obj = store.get('vips', btn.dataset.id);
        if (obj) {
          editingId = btn.dataset.id;
          formState = { ...obj };
          render();
          container.querySelector('#vip-name')?.focus();
        }
      });
    });

    container.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this VIP?')) store.remove('vips', btn.dataset.id);
      });
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    formState.name = container.querySelector('#vip-name')?.value?.trim() || '';
    formState.externalIp = container.querySelector('#vip-extip')?.value?.trim() || '';
    formState.externalPort = container.querySelector('#vip-extport')?.value?.trim() || '';
    formState.mappedIp = container.querySelector('#vip-mappedip')?.value?.trim() || '';
    formState.mappedPort = container.querySelector('#vip-mappedport')?.value?.trim() || '';
    formState.protocol = container.querySelector('#vip-protocol')?.value || 'tcp';
    formState.comment = container.querySelector('#vip-comment')?.value?.trim() || '';

    const { valid, errors } = validateVipNat(formState);

    // Clear errors
    for (const domId of ['name', 'extip', 'extport', 'mappedip', 'mappedport']) {
      const errEl = container.querySelector(`#err-vip-${domId}`);
      if (errEl) errEl.textContent = '';
      const input = container.querySelector(`#vip-${domId}`);
      if (input) input.classList.remove('input-error');
    }

    if (!valid) {
      const fieldMap = { name: 'name', externalIp: 'extip', externalPort: 'extport', mappedIp: 'mappedip', mappedPort: 'mappedport' };
      for (const [key, msg] of Object.entries(errors)) {
        const domId = fieldMap[key] || key;
        const errEl = container.querySelector(`#err-vip-${domId}`);
        if (errEl) errEl.textContent = msg;
        const input = container.querySelector(`#vip-${domId}`);
        if (input) input.classList.add('input-error');
      }
      return;
    }

    if (editingId) {
      store.update('vips', editingId, { ...formState });
      editingId = null;
    } else {
      store.add('vips', createVipNat({ ...formState }));
    }
    formState = createVipNat();
    render();
  }

  const unsub = store.subscribe('vips', () => render());
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
