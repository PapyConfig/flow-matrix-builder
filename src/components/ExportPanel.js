/**
 * ExportPanel — export buttons for each registered exporter.
 * Always visible at the bottom of the page.
 */

import { store } from '../core/store.js';
import { registry } from '../exporters/registry.js';

/**
 * Create the ExportPanel component.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void, refresh: () => void }}
 */
export function createExportPanel(container) {
  function render() {
    const exporters = registry.list();
    container.innerHTML = `
      <div class="export-panel">
        <h3>Export</h3>
        <div class="export-buttons">
          ${exporters.map(exp => `
            <button class="btn btn-export" data-exporter="${exp.name}">
              ${escapeHtml(exp.label)}
            </button>
          `).join('')}
          ${exporters.length === 0 ? '<p class="empty">No exporters registered.</p>' : ''}
        </div>
      </div>
    `;
    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('.btn-export').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.exporter;
        const exp = registry.get(name);
        if (!exp) return;

        const data = {
          objects: store.getAll('objects'),
          vips: store.getAll('vips'),
          rules: store.getAll('rules'),
        };

        try {
          const output = exp.generate(data);
          downloadFile(output, `flow-matrix.${exp.fileExtension}`, name);
        } catch (e) {
          console.error('Export failed:', e);
          alert('Export failed: ' + e.message);
        }
      });
    });
  }

  function downloadFile(content, filename, type) {
    const mimeTypes = {
      csv: 'text/csv',
      json: 'application/json',
      txt: 'text/plain',
    };
    const mime = mimeTypes[type] || 'application/octet-stream';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  render();

  return {
    destroy() { container.innerHTML = ''; },
    refresh() { render(); },
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
