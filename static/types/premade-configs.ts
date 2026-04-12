/**
 * Types for the Premade Plugin Config system.
 *
 * Premade configs provide out-of-the-box plugin configurations for pilot partners,
 * reducing the need for manual configuration. Partners select a premade config that
 * matches their use case, and all plugin settings are applied automatically.
 */

/**
 * A single plugin entry within a premade configuration.
 */
export interface PremadePluginEntry {
  plugin: string;
  with: Record<string, unknown>;
}

/**
 * A premade configuration template for pilot partners.
 */
export interface PremadeConfig {
  /** Human-readable name displayed in the UI */
  name: string;
  /** Short description of what this config is for */
  description: string;
  /** Category for grouping configs in the UI */
  category: "starter" | "partner" | "enterprise";
  /** Map of plugin name → plugin config */
  plugins: Record<string, PremadePluginEntry>;
}

/**
 * The registry that maps config IDs to their PremadeConfig objects.
 * Loaded from the JSON files in static/premade-configs/.
 */
export type PremadeConfigRegistry = Record<string, PremadeConfig>;
