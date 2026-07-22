/**
 * Exporter plugin registry.
 * Exporters register themselves with a name, label, generate function, and file extension.
 * Future exporters (Fortigate CLI, etc.) follow the same pattern.
 */

const registry = {
  /** @type {Record<string, { label: string, generate: Function, fileExtension: string }>} */
  _exporters: {},

  /**
   * Register a new exporter.
   * @param {string} name - Unique key (e.g. 'csv', 'fortigate')
   * @param {{ label: string, generate: Function, fileExtension: string }} exporter
   */
  register(name, { label, generate, fileExtension }) {
    this._exporters[name] = { label, generate, fileExtension };
  },

  /**
   * Get a registered exporter by name.
   * @param {string} name
   * @returns {{ label: string, generate: Function, fileExtension: string } | undefined}
   */
  get(name) {
    return this._exporters[name];
  },

  /**
   * List all registered exporters.
   * @returns {{ name: string, label: string, generate: Function, fileExtension: string }[]}
   */
  list() {
    return Object.entries(this._exporters).map(([k, v]) => ({ name: k, ...v }));
  },
};

export { registry };
