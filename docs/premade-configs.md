# Premade Configurations

Premade configurations are ready-to-use YAML templates that help partners quickly set up UbiquityOS with battle-tested defaults.

## Available Configs

### Standard

**File:** `src/premade-configs/standard.yml`

The full battle-tested setup. All plugins enabled with sensible defaults.

**Includes:**
- Text Conversation Rewards — token incentives for issue/PR participation
- Command Start/Stop — task assignment and management
- Daemon Pricing — automated price labels and funding

**Best for:** Organizations that want the complete UbiquityOS experience out of the box.

### Minimal

**File:** `src/premade-configs/minimal.yml`

Only essential plugins. Start/stop task management and conversation rewards.

**Includes:**
- Command Start/Stop — task assignment and management
- Text Conversation Rewards — basic token incentives

**Best for:** Organizations that want bare minimum functionality and plan to add plugins later.

### Code Review

**File:** `src/premade-configs/code-review.yml`

Engineering-focused configuration with tighter review cycles and expanded label support.

**Includes:**
- Command Start/Stop — shorter review windows (2 days), more concurrent tasks
- Text Conversation Rewards — streamlined incentives
- Daemon Pricing — reduced multiplier for code-focused workflows

**Best for:** Engineering teams focused on code quality and fast review cycles.

## How to Apply a Premade Config

### Via the Plugin Installer UI

1. Navigate to the [Plugin Installer](https://onboard.ubq.fi)
2. Authenticate with GitHub
3. Select your organization
4. Choose a template from the template selector
5. Fill in any required fields (e.g., `evmPrivateEncrypted`)
6. Click **Push to GitHub**

### Programmatically

```typescript
import { parsePremadeConfig, extractPluginsYaml } from "./src/premade-configs";
import { readFileSync } from "fs";

// Load and parse a premade config
const yaml = readFileSync("src/premade-configs/standard.yml", "utf-8");
const config = parsePremadeConfig(yaml);

// Extract just the plugins section
const pluginsYaml = extractPluginsYaml(config);
console.log(pluginsYaml);
```

## How to Customize After Applying

After applying a premade config, you can customize it by editing the `ubiquity-os.config.yml` file in your organization's `.ubiquity-os` config repository.

Common customizations:

### Adjust Task Limits

```yaml
# In command-start-stop plugin config
maxConcurrentTasks:
  member: 5    # increase from 2
  contributor: 3
```

### Change Review Timelines

```yaml
reviewDelayTolerance: "5 Days"     # extend from 3 days
taskStaleTimeoutDuration: "60 Days" # extend from 30 days
```

### Modify Pricing

```yaml
# In daemon-pricing plugin config
basePriceMultiplier: 3   # increase from 2
```

### Add/Remove Plugins

Simply add or remove plugin blocks from the `plugins` array. Each plugin follows this structure:

```yaml
plugins:
  - uses:
      - plugin: <plugin-url-or-ref>
        with:
          <plugin-specific-config>
```

## Creating Custom Premade Configs

To create a new premade config:

1. Create a new `.yml` file in `src/premade-configs/`
2. Include a `_metadata` section with `name`, `description`, `version`, and `target`
3. Add your `plugins` array
4. Register it in `src/premade-configs/index.ts` by adding to the `PREMADE_CONFIGS` array
5. Update this documentation

### Config File Structure

```yaml
_metadata:
  name: my-custom-config
  description: "Description of what this config provides"
  version: "1.0.0"
  target: "Who should use this config"

plugins:
  - uses:
      - plugin: <plugin-url>
        with:
          <config-options>
```

### Validation

All premade configs are validated by the loader. Required fields:

- `_metadata.name` — non-empty string
- `_metadata.description` — string describing the config
- `plugins` — array of plugin entries
- Each plugin must have a `uses` array with valid `plugin` URLs
