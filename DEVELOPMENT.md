# Development Guide

## Adding a New Exporter

The Flow Matrix Builder uses a plugin-based exporter registry. To add a new exporter (e.g. Fortigate CLI), follow these steps:

### 1. Create the exporter file

Create a new file in `src/exporters/`, for example `src/exporters/fortigate.js`:

```js
// src/exporters/fortigate.js

import { registry } from './registry.js';

/**
 * Generate Fortigate CLI commands from Flow Matrix data.
 * @param {{ objects: object[], vips: object[], rules: object[] }} data
 * @returns {string}
 */
function generateFortigate(data) {
  const lines = [];
  const { objects = [], vips = [], rules = [] } = data;

  // Generate firewall address objects
  for (const obj of objects) {
    switch (obj.type) {
      case 'host':
        lines.push(`config firewall address`);
        lines.push(`  edit "${obj.name}"`);
        lines.push(`    set subnet ${obj.value}/32`);
        lines.push(`  next`);
        lines.push(`end`);
        break;
      case 'subnet':
        lines.push(`config firewall address`);
        lines.push(`  edit "${obj.name}"`);
        lines.push(`    set subnet ${obj.value}`);
        lines.push(`  next`);
        lines.push(`end`);
        break;
      // ... handle range, group
    }
    lines.push('');
  }

  // Generate VIP entries
  for (const vip of vips) {
    lines.push(`config firewall vip`);
    lines.push(`  edit "${vip.name}"`);
    lines.push(`    set extip ${vip.externalIp}`);
    lines.push(`    set mappedip ${vip.mappedIp}`);
    lines.push(`    set extintf "any"`);
    lines.push(`    set portforward enable`);
    lines.push(`    set extport ${vip.externalPort}`);
    lines.push(`    set mappedport ${vip.mappedPort}`);
    lines.push(`  next`);
    lines.push(`end`);
    lines.push('');
  }

  // Generate firewall policy
  for (const rule of rules) {
    lines.push(`config firewall policy`);
    lines.push(`  edit 0`);
    lines.push(`    set name "${rule.name}"`);
    lines.push(`    set srcaddr ${rule.source.map(s => `"${s}"`).join(' ')}`);
    lines.push(`    set dstaddr ${rule.destination.map(d => `"${d}"`).join(' ')}`);
    lines.push(`    set service ${rule.service.map(s => `"${s}"`).join(' ')}`);
    lines.push(`    set action ${rule.action}`);
    lines.push(`    set logtraffic ${rule.log ? 'all' : 'disable'}`);
    lines.push(`    set schedule "always"`);
    lines.push(`  next`);
    lines.push(`end`);
    lines.push('');
  }

  return lines.join('\n');
}

// Self-register the exporter
registry.register('fortigate', {
  label: 'Export Fortigate CLI',
  generate: generateFortigate,
  fileExtension: 'txt',
});
```

### 2. Import the exporter in `app.js`

Add the import at the top of `src/app.js`:

```js
import './exporters/fortigate.js';
```

That's it! The export button will appear automatically in the Export panel.

### Exporter contract

Each exporter must call `registry.register(name, config)` with:

| Property        | Type       | Description                            |
| --------------- | ---------- | -------------------------------------- |
| `label`         | `string`   | Button text in the Export panel        |
| `generate`      | `function` | `(data) => string` — receives store data, returns file content |
| `fileExtension` | `string`   | File extension for the download (e.g. `csv`, `txt`) |

### Data structure passed to `generate()`

```js
{
  objects: NetworkObject[],  // all network objects
  vips: VipNat[],            // all VIP/NAT entries
  rules: FirewallRule[],     // all firewall rules
}
```

## Project Structure

```
index.html              Entry point
src/
  app.js                Main app, wires tabs + components
  styles.css            All styles
  sampleData.js         Sample data loader
  core/
    id.js               ID generator
    models.js           Data factories
    schema.js           Validation
    store.js            State management
  components/
    ObjectForm.js        Network Objects form + table
    VipForm.js           VIP/NAT form + table
    FirewallForm.js      Firewall rules form + table
    MatrixTable.js       Combined matrix overview
    ExportPanel.js       Export buttons
  exporters/
    registry.js          Plugin registry
    csv.js               CSV exporter
```

## Development

Open `index.html` directly in a browser, or serve with any static HTTP server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

No build step required. All modules use native ES `import`/`export`.
