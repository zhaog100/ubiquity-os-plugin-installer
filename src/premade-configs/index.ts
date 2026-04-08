/**
 * Premade configuration loader and registry.
 *
 * Provides YAML-based configuration templates that partners can apply
 * to quickly set up UbiquityOS with sensible defaults.
 */
import YAML from "yaml";
import { PremadeConfig, PremadeConfigEntry, PremadeConfigName } from "./schema";

/**
 * Registry of available premade configurations.
 */
export const PREMADE_CONFIGS: PremadeConfigEntry[] = [
  {
    name: "standard",
    filename: "standard.yml",
    label: "Standard",
    description: "Full battle-tested setup with all plugins enabled and sensible defaults. For orgs that want everything.",
  },
  {
    name: "minimal",
    filename: "minimal.yml",
    label: "Minimal",
    description: "Only essential plugins (start/stop, conversation rewards). For orgs that want the bare minimum.",
  },
  {
    name: "code-review",
    filename: "code-review.yml",
    label: "Code Review",
    description: "Review plugins with automated checks. For engineering teams focused on code quality.",
  },
];

/**
 * Validates a parsed premade config against basic structural requirements.
 *
 * @param config - The parsed configuration object
 * @throws {Error} If the config is structurally invalid
 */
export function validatePremadeConfig(config: PremadeConfig): void {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid config: must be an object");
  }

  if (!config._metadata) {
    throw new Error('Invalid config: missing "_metadata" section');
  }

  if (!config._metadata.name || typeof config._metadata.name !== "string") {
    throw new Error('Invalid config: "_metadata.name" must be a non-empty string');
  }

  if (!config.plugins || !Array.isArray(config.plugins)) {
    throw new Error('Invalid config: "plugins" must be an array');
  }

  for (let i = 0; i < config.plugins.length; i++) {
    const plugin = config.plugins[i];
    if (!plugin.uses || !Array.isArray(plugin.uses)) {
      throw new Error(`Invalid config: plugins[${i}].uses must be an array`);
    }

    for (let j = 0; j < plugin.uses.length; j++) {
      const use = plugin.uses[j];
      if (!use.plugin || typeof use.plugin !== "string") {
        throw new Error(`Invalid config: plugins[${i}].uses[${j}].plugin must be a non-empty string`);
      }
      if (use.with && typeof use.with !== "object") {
        throw new Error(`Invalid config: plugins[${i}].uses[${j}].with must be an object`);
      }
    }
  }
}

/**
 * Parses a YAML string into a typed PremadeConfig and validates it.
 *
 * @param yamlContent - Raw YAML string of a premade config
 * @returns Validated PremadeConfig object
 * @throws {Error} If parsing or validation fails
 */
export function parsePremadeConfig(yamlContent: string): PremadeConfig {
  const parsed = YAML.parse(yamlContent);

  if (!parsed) {
    throw new Error("Failed to parse YAML content");
  }

  validatePremadeConfig(parsed);
  return parsed as PremadeConfig;
}

/**
 * Returns only the plugins section of a premade config as a YAML string,
 * suitable for writing to the UbiquityOS configuration file.
 * The _metadata section is stripped from the output.
 *
 * @param config - A validated PremadeConfig object
 * @returns YAML string containing only the plugins array
 */
export function extractPluginsYaml(config: PremadeConfig): string {
  const { plugins } = config;
  return YAML.stringify({ plugins });
}

/**
 * Lists all available premade config entries.
 *
 * @returns Array of PremadeConfigEntry objects
 */
export function listPremadeConfigs(): PremadeConfigEntry[] {
  return [...PREMADE_CONFIGS];
}

/**
 * Gets a specific premade config entry by name.
 *
 * @param name - The premade config name to look up
 * @returns The matching PremadeConfigEntry or undefined
 */
export function getPremadeConfigEntry(name: PremadeConfigName): PremadeConfigEntry | undefined {
  return PREMADE_CONFIGS.find((c) => c.name === name);
}
