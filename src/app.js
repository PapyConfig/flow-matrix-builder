/**
 * Flow Matrix Builder — Main entry point.
 * Wires tabs, components, and exporters together.
 */

// Register exporters (import side-effects)
import './exporters/csv.js';

import { createObjectForm } from './components/ObjectForm.js';
import { createVipForm } from './components/VipForm.js';
import { createFirewallForm } from './components/FirewallForm.js';
import { createMatrixTable } from './components/MatrixTable.js';
import { createExportPanel } from './components/ExportPanel.js';
import { store } from './core/store.js';
import { loadSampleData } from './sampleData.js';

// --- Tab management ---------------------------------------------------------

const TAB_CONFIG = [
  { id: 'objects', label: 'Network Objects' },
  { id: 'vips', label: 'VIPs / NAT' },
  { id: 'rules', label: 'Firewall Rules' },
  { id: 'matrix', label: 'Matrix Overview' },
];

let activeTab = 'objects';
let currentComponent = null;

function switchTab(tabId) {
  activeTab = tabId;

  // Update tab button states
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Destroy current component
  if (currentComponent && currentComponent.destroy) {
    currentComponent.destroy();
  }

  const contentEl = document.getElementById('tab-content');
  contentEl.innerHTML = '';

  // Mount new component
  switch (tabId) {
    case 'objects':
      currentComponent = createObjectForm(contentEl);
      break;
    case 'vips':
      currentComponent = createVipForm(contentEl);
      break;
    case 'rules':
      currentComponent = createFirewallForm(contentEl);
      break;
    case 'matrix':
      currentComponent = createMatrixTable(contentEl);
      break;
  }
}

// --- Initialize -------------------------------------------------------------

function init() {
  // Render tab bar
  const tabBar = document.getElementById('tab-bar');
  tabBar.innerHTML = TAB_CONFIG.map(tab => `
    <button class="tab-btn ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">
      ${tab.label}
    </button>
  `).join('');

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn && btn.dataset.tab) {
      switchTab(btn.dataset.tab);
    }
  });

  // Mount export panel
  const exportContainer = document.getElementById('export-panel');
  createExportPanel(exportContainer);

  // Load sample data button
  const sampleBtn = document.getElementById('btn-load-sample');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      if (confirm('Load sample data? This will replace any existing data.')) {
        store.clear('objects');
        store.clear('vips');
        store.clear('rules');
        loadSampleData();
        switchTab(activeTab); // refresh current tab
      }
    });
  }

  // Clear all button
  const clearBtn = document.getElementById('btn-clear-all');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all data? This cannot be undone.')) {
        store.clear('objects');
        store.clear('vips');
        store.clear('rules');
        switchTab(activeTab);
      }
    });
  }

  // Activate first tab
  switchTab(activeTab);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
