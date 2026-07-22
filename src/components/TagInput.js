/**
 * TagInput — autocomplete multi-select input with chips.
 * Used in FirewallForm for source, destination, and service fields.
 * Supports searching objects by name or value.
 */

import { store } from '../core/store.js';

/**
 * Create a tag-input autocomplete field.
 * @param {HTMLElement} container - The .form-group to enhance
 * @param {Object} opts
 * @param {string} opts.inputId - ID of the existing <input>
 * @param {string[]} opts.initialValues - Pre-selected values
 * @param {'object'|'vip'|'service'} opts.searchType - What to search
 * @param {(values: string[]) => void} opts.onChange - Called when tags change
 * @returns {{ getValues: () => string[], setValues: (v: string[]) => void, destroy: () => void }}
 */
export function createTagInput(container, opts) {
  const { inputId, initialValues = [], searchType, onChange } = opts;
  let values = [...initialValues];
  let dropdownVisible = false;
  let selectedIndex = -1;
  let filteredResults = [];

  const input = container.querySelector(`#${inputId}`);
  if (!input) return { getValues: () => values, setValues: () => {}, destroy: () => {} };

  // Hide original input, create wrapper
  input.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.className = 'tag-input-wrapper';
  wrapper.innerHTML = `
    <div class="tag-input-chips" id="chips-${inputId}"></div>
    <input type="text" class="tag-input-field" id="field-${inputId}" placeholder="${input.placeholder || ''}" autocomplete="off" />
    <div class="tag-input-dropdown" id="dropdown-${inputId}"></div>
  `;
  input.parentNode.insertBefore(wrapper, input);

  const chipsEl = wrapper.querySelector(`#chips-${inputId}`);
  const fieldEl = wrapper.querySelector(`#field-${inputId}`);
  const dropdownEl = wrapper.querySelector(`#dropdown-${inputId}`);

  function renderChips() {
    chipsEl.innerHTML = values.map((val, i) => `
      <span class="tag-chip">
        ${escapeHtml(val)}
        <button type="button" class="tag-chip-remove" data-index="${i}" aria-label="Remove ${escapeHtml(val)}">&times;</button>
      </span>
    `).join('');

    // Sync hidden input
    input.value = values.join(', ');

    // Bind remove buttons
    chipsEl.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.index, 10);
        values.splice(idx, 1);
        renderChips();
        if (onChange) onChange(values);
      });
    });
  }

  function searchObjects(query) {
    if (!query || query.trim() === '') return [];
    const q = query.toLowerCase();
    const objects = store.getAll('objects');
    const vips = store.getAll('vips');

    const results = [];

    if (searchType === 'object' || searchType === 'vip') {
      for (const obj of objects) {
        const nameMatch = obj.name.toLowerCase().includes(q);
        const valueMatch = obj.value.toLowerCase().includes(q);
        if (nameMatch || valueMatch) {
          results.push({
            value: obj.name,
            label: `${obj.name} (${obj.value})`,
            type: 'object',
          });
        }
      }
      for (const vip of vips) {
        const nameMatch = vip.name.toLowerCase().includes(q);
        const extIpMatch = vip.externalIp.toLowerCase().includes(q);
        const mappedIpMatch = vip.mappedIp.toLowerCase().includes(q);
        if (nameMatch || extIpMatch || mappedIpMatch) {
          results.push({
            value: vip.name,
            label: `${vip.name} (${vip.externalIp}:${vip.externalPort} → ${vip.mappedIp}:${vip.mappedPort})`,
            type: 'vip',
          });
        }
      }
    }

    if (searchType === 'service') {
      // Collect unique services from existing rules
      const rules = store.getAll('rules');
      const seen = new Set();
      for (const rule of rules) {
        for (const svc of (rule.service || [])) {
          if (!seen.has(svc)) {
            seen.add(svc);
            if (svc.toLowerCase().includes(q)) {
              results.push({
                value: svc,
                label: svc,
                type: 'service',
              });
            }
          }
        }
      }
    }

    // Filter out already selected values
    return results.filter(r => !values.includes(r.value));
  }

  function showDropdown() {
    const query = fieldEl.value;
    filteredResults = searchObjects(query);
    selectedIndex = -1;

    if (filteredResults.length === 0 && query.trim() === '') {
      hideDropdown();
      return;
    }

    let html = '';
    if (filteredResults.length > 0) {
      html = filteredResults.map((r, i) => `
        <div class="tag-dropdown-item" data-index="${i}">
          <span class="tag-dropdown-label">${escapeHtml(r.label)}</span>
          <span class="tag-dropdown-type tag-type-${r.type}">${escapeHtml(r.type)}</span>
        </div>
      `).join('');
    }
    // Always show "add as free text" option if query is non-empty and not an exact match
    if (query.trim() && !filteredResults.some(r => r.value === query.trim())) {
      html += `<div class="tag-dropdown-item tag-dropdown-freetext" data-index="-1">
        <span class="tag-dropdown-label">Add "${escapeHtml(query.trim())}" (custom)</span>
      </div>`;
    }

    dropdownEl.innerHTML = html;
    dropdownEl.classList.add('visible');
    dropdownVisible = true;

    // Bind click on items
    dropdownEl.querySelectorAll('.tag-dropdown-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(item.dataset.index, 10);
        if (idx === -1) {
          addValue(query.trim());
        } else if (filteredResults[idx]) {
          addValue(filteredResults[idx].value);
        }
      });
    });
  }

  function hideDropdown() {
    dropdownEl.classList.remove('visible');
    dropdownVisible = false;
    selectedIndex = -1;
    filteredResults = [];
  }

  function addValue(val) {
    if (!val || values.includes(val)) return;
    values.push(val);
    fieldEl.value = '';
    renderChips();
    hideDropdown();
    if (onChange) onChange(values);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (dropdownVisible && selectedIndex >= 0 && filteredResults[selectedIndex]) {
        addValue(filteredResults[selectedIndex].value);
      } else if (fieldEl.value.trim()) {
        addValue(fieldEl.value.trim());
      }
    } else if (e.key === ',') {
      e.preventDefault();
      if (fieldEl.value.trim()) {
        addValue(fieldEl.value.trim());
      }
    } else if (e.key === 'Backspace' && fieldEl.value === '' && values.length > 0) {
      values.pop();
      renderChips();
      if (onChange) onChange(values);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        selectedIndex = Math.min(selectedIndex + 1, filteredResults.length - 1);
        highlightItem();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        selectedIndex = Math.max(selectedIndex - 1, 0);
        highlightItem();
      }
    } else if (e.key === 'Escape') {
      hideDropdown();
    }
  }

  function highlightItem() {
    dropdownEl.querySelectorAll('.tag-dropdown-item').forEach((item, i) => {
      item.classList.toggle('highlighted', i === selectedIndex);
    });
  }

  // Event listeners
  fieldEl.addEventListener('input', () => showDropdown());
  fieldEl.addEventListener('focus', () => showDropdown());
  fieldEl.addEventListener('blur', () => {
    // Delay to allow mousedown on dropdown items
    setTimeout(hideDropdown, 200);
  });
  fieldEl.addEventListener('keydown', handleKeydown);

  // Focus field when clicking wrapper
  wrapper.addEventListener('click', () => fieldEl.focus());

  // Initial render
  renderChips();

  return {
    getValues() { return [...values]; },
    setValues(newVals) {
      values = [...newVals];
      renderChips();
    },
    destroy() {
      wrapper.remove();
      input.style.display = '';
    },
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
