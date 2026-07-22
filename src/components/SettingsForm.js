/**
 * SettingsForm — Settings tab component.
 * Manages naming conventions and app-wide configuration.
 */

import { loadNamingSettings, saveNamingSettings, getPrefixLabel, getAutoNamePreview } from '../core/naming.js';

// Default prefixes for reset and placeholders
const DEFAULT_PREFIXES = {
  host: 'srv-',
  subnet: 'net-',
  range: 'rng-',
  group: 'grp-',
  vip: 'vip-',
  fw_allow: 'allow-',
  fw_deny: 'deny-',
};

/**
 * Create the SettingsForm component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function createSettingsForm(container) {
  let settings = loadNamingSettings();
  let saveTimer = null;

  function render() {
    settings = loadNamingSettings();

    const prefixKeys = ['host', 'subnet', 'range', 'group', 'vip', 'fw_allow', 'fw_deny'];
    const previewHost = getAutoNamePreview('host', 'web-01');
    const previewVip = getAutoNamePreview('vip', 'web-https');
    const previewFwAllow = getAutoNamePreview('fw', 'ext-https', 'allow');
    const previewFwDeny = getAutoNamePreview('fw', 'all-internal', 'deny');

    container.innerHTML = `
      <div class="form-card">
        <h3>Naming Convention</h3>
        <p class="settings-description">Configure auto-naming patterns for new objects. When enabled, names are auto-generated on creation based on the patterns below. You can always override the name manually before submitting.</p>

        <div class="settings-section">
          <div class="settings-toggle-row">
            <label class="toggle-label" for="settings-auto-naming">
              <input type="checkbox" id="settings-auto-naming" ${settings.enabled ? 'checked' : ''} />
              <span class="toggle-text">Enable Auto-Naming</span>
            </label>
            <span class="toggle-status ${settings.enabled ? 'status-on' : 'status-off'}">${settings.enabled ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        <div class="settings-section ${settings.enabled ? '' : 'settings-disabled'}">
          <h4>Prefixes</h4>
          <p class="settings-hint">Prefix auto-prepended to the user-entered name based on object type.</p>
          <div class="settings-grid">
            ${prefixKeys.map(key => `
              <div class="settings-field">
                <label for="prefix-${key}">${getPrefixLabel(key)}</label>
                <input type="text" id="prefix-${key}" value="${escapeAttr(settings.prefixes[key] || '')}" placeholder="${escapeAttr(DEFAULT_PREFIXES[key] || '')}" data-prefix-key="${key}" />
              </div>
            `).join('')}
          </div>
        </div>

        <div class="settings-section ${settings.enabled ? '' : 'settings-disabled'}">
          <h4>Global Suffix</h4>
          <p class="settings-hint">Appended to all auto-generated names (e.g. <code>-prod</code>, <code>-staging</code>). Leave empty for no suffix.</p>
          <div class="settings-field settings-field-suffix">
            <input type="text" id="settings-suffix" value="${escapeAttr(settings.globalSuffix)}" placeholder="-prod" />
          </div>
        </div>

        <div class="settings-section ${settings.enabled ? '' : 'settings-disabled'}">
          <h4>Preview</h4>
          <div class="settings-preview">
            <div class="preview-item"><span class="preview-type">Host:</span> <code>${escapeHtml(previewHost)}</code></div>
            <div class="preview-item"><span class="preview-type">VIP:</span> <code>${escapeHtml(previewVip)}</code></div>
            <div class="preview-item"><span class="preview-type">FW (allow):</span> <code>${escapeHtml(previewFwAllow)}</code></div>
            <div class="preview-item"><span class="preview-type">FW (deny):</span> <code>${escapeHtml(previewFwDeny)}</code></div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-primary" id="settings-save">Save Settings</button>
          <button type="button" class="btn btn-secondary" id="settings-reset">Reset to Defaults</button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function collectSettings() {
    const enabled = container.querySelector('#settings-auto-naming')?.checked || false;
    const globalSuffix = container.querySelector('#settings-suffix')?.value || '';
    const prefixes = {};
    container.querySelectorAll('[data-prefix-key]').forEach(input => {
      prefixes[input.dataset.prefixKey] = input.value;
    });
    return { enabled, globalSuffix, prefixes };
  }

  function bindEvents() {
    // Auto-save on toggle change for immediate preview
    const toggle = container.querySelector('#settings-auto-naming');
    if (toggle) {
      toggle.addEventListener('change', () => {
        const newSettings = collectSettings();
        saveNamingSettings(newSettings);
        settings = newSettings;
        render();
      });
    }

    // Live preview on prefix/suffix input changes
    container.querySelectorAll('[data-prefix-key]').forEach(input => {
      input.addEventListener('input', () => {
        const newSettings = collectSettings();
        saveNamingSettings(newSettings);
        settings = newSettings;
        updatePreviews();
      });
    });

    const suffixInput = container.querySelector('#settings-suffix');
    if (suffixInput) {
      suffixInput.addEventListener('input', () => {
        const newSettings = collectSettings();
        saveNamingSettings(newSettings);
        settings = newSettings;
        updatePreviews();
      });
    }

    // Save button
    const saveBtn = container.querySelector('#settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const newSettings = collectSettings();
        saveNamingSettings(newSettings);
        settings = newSettings;
        showSaveConfirmation();
      });
    }

    // Reset button
    const resetBtn = container.querySelector('#settings-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all naming settings to defaults?')) {
          saveNamingSettings({
            enabled: false,
            globalSuffix: '',
            prefixes: { ...DEFAULT_PREFIXES },
          });
          render();
        }
      });
    }
  }

  function updatePreviews() {
    const previewEls = container.querySelectorAll('.preview-item code');
    if (previewEls.length >= 4) {
      // Settings are already persisted by the input handlers, so just read
      previewEls[0].textContent = getAutoNamePreview('host', 'web-01');
      previewEls[1].textContent = getAutoNamePreview('vip', 'web-https');
      previewEls[2].textContent = getAutoNamePreview('fw', 'ext-https', 'allow');
      previewEls[3].textContent = getAutoNamePreview('fw', 'all-internal', 'deny');
    }
  }

  function showSaveConfirmation() {
    const saveBtn = container.querySelector('#settings-save');
    if (saveBtn) {
      // Clear any existing timer to prevent leak
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const original = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      saveTimer = setTimeout(() => {
        saveBtn.textContent = original;
        saveBtn.disabled = false;
        saveTimer = null;
      }, 1500);
    }
  }

  render();

  return {
    destroy() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
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
