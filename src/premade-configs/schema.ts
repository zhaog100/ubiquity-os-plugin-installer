/**
 * Schema types for premade configurations.
 * These types define the structure of YAML-based premade config templates.
 */

/** Metadata describing a premade configuration template */
export interface PremadeConfigMetadata {
  name: string;
  description: string;
  version: string;
  target: string;
}

/** A single plugin entry in the uses list */
export interface PremadePluginUse {
  plugin: string;
  skipBotEvents?: boolean;
  with: Record<string, unknown>;
}

/** A plugin configuration block */
export interface PremadePlugin {
  uses?: PremadePluginUse[];
  skipBotEvents?: boolean;
}

/** The full premade configuration structure parsed from YAML */
export interface PremadeConfig {
  _metadata: PremadeConfigMetadata;
  plugins: PremadePlugin[];
}

/** Available premade config template names */
export type PremadeConfigName = "standard" | "minimal" | "code-review";

/** Registry entry for a premade config */
export interface PremadeConfigEntry {
  name: PremadeConfigName;
  filename: string;
  label: string;
  description: string;
}
