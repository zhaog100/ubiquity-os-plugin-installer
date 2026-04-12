import YAML from "yaml";
import { CONFIG_FULL_PATH, CONFIG_ORG_REPO } from "@ubiquity-os/plugin-sdk/constants";
import { AuthService } from "../authentication";
import { ManifestRenderer } from "../render-manifest";
import { controlButtons } from "../rendering/control-buttons";
import { addTrackedEventListener, updateGuiTitle } from "../rendering/utils";
import { ManifestPreDecode, Plugin, PluginConfig } from "../../types/plugins";
import { createElement, createInputRow } from "../../utils/element-helpers";
import { getManifestCache } from "../../utils/storage";
import { STRINGS } from "../../utils/strings";
import { toastNotification } from "../../utils/toaster";
import { PremadeConfig, PremadeConfigRegistry } from "../../types/premade-configs";
import { AnySchemaObject } from "ajv";

/**
 * Loads and manages premade configurations for pilot partners.
 *
 * Premade configs are bundled JSON files that provide out-of-the-box
 * plugin setups for common use cases (open-source projects, bounty programs, etc.).
 * Partners select a config that matches their needs, and all plugin settings
 * are applied automatically — no technical knowledge required.
 */

// These are injected at build time by esbuild
declare const PREMADE_CONFIGS: string;

/**
 * Returns the premade config registry parsed from the bundled JSON.
 */
export function getPremadeConfigRegistry(): PremadeConfigRegistry {
  return JSON.parse(PREMADE_CONFIGS) as PremadeConfigRegistry;
}

/**
 * Returns a sorted list of premade config entries for display.
 */
export function getPremadeConfigList(): [string, PremadeConfig][] {
  const registry = getPremadeConfigRegistry();
  const categoryOrder: Record<string, number> = { starter: 0, partner: 1, enterprise: 2 };
  return Object.entries(registry).sort((a, b) => (categoryOrder[a[1].category] ?? 99) - (categoryOrder[b[1].category] ?? 99));
}

/**
 * Converts a PremadeConfig into a PluginConfig that can be saved and pushed.
 */
export function premadeConfigToPluginConfig(premade: PremadeConfig): PluginConfig {
  const plugins: Plugin[] = [];

  for (const [, entry] of Object.entries(premade.plugins)) {
    plugins.push({
      uses: [
        {
          plugin: entry.plugin,
          with: entry.with,
        },
      ],
    });
  }

  return { plugins };
}

/**
 * Returns a list of plugin keys from the premade config that have missing required fields.
 * These are fields the user must fill in before the config can be applied.
 */
export function findMissingRequiredFields(premade: PremadeConfig, manifestCache: Record<string, ManifestPreDecode>): string[] {
  const missing: string[] = [];

  for (const [pluginKey, entry] of Object.entries(premade.plugins)) {
    const cached = findManifestInCache(pluginKey, manifestCache);
    if (!cached?.manifest?.configuration) {
      continue;
    }

    const { configuration } = cached.manifest;
    const required = configuration.required || [];
    const providedKeys = Object.keys(entry.with);

    for (const reqKey of required) {
      if (!providedKeys.includes(reqKey)) {
        missing.push(`${pluginKey}.${reqKey}`);
      }
    }
  }

  return missing;
}

/**
 * Finds a manifest in the cache by matching the plugin key against
 * repo names and homepage URLs.
 */
function findManifestInCache(pluginKey: string, manifestCache: Record<string, ManifestPreDecode>): ManifestPreDecode | null {
  // Direct match
  if (manifestCache[pluginKey]) {
    return manifestCache[pluginKey];
  }

  // Try matching by partial name in keys
  for (const [key, value] of Object.entries(manifestCache)) {
    if (key.includes(pluginKey) || pluginKey.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Writes the premade config to GitHub after applying any user-provided required fields.
 */
export async function applyPremadeConfig(configId: string, renderer: ManifestRenderer, userInputs?: Record<string, unknown>): Promise<void> {
  const registry = getPremadeConfigRegistry();
  const premade = registry[configId];

  if (!premade) {
    throw new Error(`Premade config "${configId}" not found`);
  }

  const org = localStorage.getItem("selectedOrg");
  if (!org) {
    throw new Error("No selected org found");
  }

  const octokit = renderer.auth.octokit;
  if (!octokit) {
    throw new Error("Octokit not found");
  }

  const userInstalledConfig = await renderer.configParser.fetchUserInstalledConfig(org, octokit);
  if (userInstalledConfig.length > 12) {
    toastNotification("Configuration File Detected: This will be overwritten if you continue.", { type: "warning", shouldAutoDismiss: true });
  }

  // Merge user inputs for required fields into the premade config
  if (userInputs) {
    for (const [pluginKey, pluginEntry] of Object.entries(premade.plugins)) {
      for (const [inputKey, inputValue] of Object.entries(userInputs)) {
        if (inputKey.startsWith(`${pluginKey}.`)) {
          const fieldKey = inputKey.slice(pluginKey.length + 1);
          pluginEntry.with[fieldKey] = inputValue;
        }
      }
    }
  }

  const pluginConfig = premadeConfigToPluginConfig(premade);
  const yamlConfig = YAML.stringify(pluginConfig);

  await writePremadeConfig(renderer, yamlConfig, premade.name, octokit, org);
}

async function writePremadeConfig(renderer: ManifestRenderer, config: string, configName: string, octokit: AuthService["octokit"], org: string) {
  try {
    renderer.configParser.saveConfig(config);
    toastNotification(`Successfully loaded "${configName}" premade config. Do you want to push to GitHub?`, {
      type: "success",
      actionText: "Push to GitHub",
      action: async () => {
        try {
          await renderer.configParser.createOrUpdateFileContents(org, CONFIG_ORG_REPO, CONFIG_FULL_PATH, octokit);
        } catch (error) {
          console.error("Error pushing config to GitHub:", error);
          toastNotification("An error occurred while pushing the configuration to GitHub.", {
            type: "error",
            shouldAutoDismiss: true,
          });
          return;
        }
        toastNotification("Configuration pushed to GitHub successfully.", {
          type: "success",
          shouldAutoDismiss: true,
        });
      },
    });
  } catch (error) {
    toastNotification("Failed to apply premade configuration.", { type: "error" });
    throw error;
  }
}

/**
 * Renders the UI for selecting a premade configuration.
 * Shows available configs grouped by category, with descriptions.
 */
export function renderPremadeConfigSelector(renderer: ManifestRenderer): void {
  renderer.manifestGuiBody.innerHTML = null;
  controlButtons({ hide: true });

  const configs = getPremadeConfigList();
  const manifestCache = getManifestCache();

  if (configs.length === 0) {
    const row = createElement("tr", {});
    const cell = createElement("td", { colspan: "4", textContent: "No premade configurations available.", className: "td-centered" });
    row.appendChild(cell);
    renderer.manifestGuiBody.appendChild(row);
    return;
  }

  let currentCategory = "";

  for (const [configId, config] of configs) {
    // Category header
    if (config.category !== currentCategory) {
      currentCategory = config.category;
      const headerRow = createElement("tr", {});
      const headerCell = createElement("td", {
        colspan: "4",
        textContent: categoryLabel(config.category),
        className: "premade-category-header",
      });
      headerRow.appendChild(headerCell);
      renderer.manifestGuiBody.appendChild(headerRow);
    }

    const row = createElement("tr", { className: "premade-config-row" });
    const cell = createElement("td", { colspan: "4", className: "premade-config-cell" });

    const container = createElement("div", { class: "premade-config-option" });

    const info = createElement("div", { class: "premade-config-info" });
    const nameEl = createElement("h3", { textContent: config.name, class: "premade-config-name" });
    const descEl = createElement("p", { textContent: config.description, class: "premade-config-desc" });
    const pluginCount = createElement("span", {
      textContent: `${Object.keys(config.plugins).length} plugin${Object.keys(config.plugins).length !== 1 ? "s" : ""}`,
      class: "premade-config-badge",
    });

    info.appendChild(nameEl);
    info.appendChild(descEl);
    info.appendChild(pluginCount);
    container.appendChild(info);

    const applyBtn = createElement("button", { textContent: "Apply", class: "premade-apply-btn" });
    applyBtn.addEventListener("click", () => {
      const missing = findMissingRequiredFields(config, manifestCache);
      if (missing.length > 0) {
        renderRequiredFieldsForm(renderer, configId, config, missing);
      } else {
        applyPremadeConfig(configId, renderer).catch((error) => {
          console.error("Error applying premade config:", error);
          toastNotification("Failed to apply premade configuration.", { type: "error", shouldAutoDismiss: true });
        });
      }
    });
    container.appendChild(applyBtn);

    cell.appendChild(container);
    row.appendChild(cell);
    renderer.manifestGuiBody.appendChild(row);
  }

  updateGuiTitle("Select a Premade Configuration");
}

/**
 * Renders a form for the user to fill in required fields that are missing
 * from a premade config before applying it.
 */
function renderRequiredFieldsForm(renderer: ManifestRenderer, configId: string, config: PremadeConfig, missing: string[]): void {
  renderer.manifestGuiBody.innerHTML = null;
  controlButtons({ hide: false });

  const configDefaults: Record<string, { type: string; value: unknown; items: { type: string } | null }> = {};

  for (const fieldPath of missing) {
    const row = createElement("tr", { className: "config-row" });
    const headerCell = createElement("td", { className: "table-data-header" });
    headerCell.textContent = fieldPath.replace(/([A-Z])/g, " $1");
    row.appendChild(headerCell);
    createInputRow(fieldPath, null, configDefaults, undefined, undefined, true);
  }

  updateGuiTitle(`Fill in required fields for "${config.name}"`);

  const addBtn = document.getElementById("add") as HTMLButtonElement;
  const removeBtn = document.getElementById("remove") as HTMLButtonElement;
  const resetBtn = document.getElementById("reset-to-default") as HTMLButtonElement;

  if (removeBtn) {
    removeBtn.classList.add("disabled");
  }
  if (resetBtn) {
    resetBtn.hidden = true;
  }

  if (addBtn) {
    addTrackedEventListener(addBtn, "click", () => {
      const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(".config-input");
      const userInputs: Record<string, unknown> = {};

      inputs.forEach((input) => {
        const key = input.getAttribute("data-config-key");
        if (!key) return;

        const expectedType = input.getAttribute("data-type");
        let value: unknown;

        if (expectedType === "boolean") {
          value = (input as HTMLInputElement).checked;
        } else if (expectedType === "object" || expectedType === "array") {
          try {
            value = JSON.parse((input as HTMLTextAreaElement).value);
          } catch {
            toastNotification(`Invalid JSON for field: ${key}`, { type: "error", shouldAutoDismiss: true });
            return;
          }
        } else if (expectedType === "number" || expectedType === "integer") {
          value = Number((input as HTMLInputElement).value);
        } else {
          value = (input as HTMLInputElement).value;
        }

        if (value === "" || value === undefined) {
          toastNotification(`Required field missing: ${key}`, { type: "error", shouldAutoDismiss: true });
          return;
        }

        userInputs[key] = value;
      });

      if (Object.keys(userInputs).length === missing.length) {
        applyPremadeConfig(configId, renderer, userInputs).catch((error) => {
          console.error("Error applying premade config:", error);
          toastNotification("Failed to apply premade configuration.", { type: "error", shouldAutoDismiss: true });
        });
      }
    });
  }

  renderer.manifestGui?.classList.add("plugin-editor");
  renderer.manifestGui?.classList.add("rendered");
}

function categoryLabel(category: string): string {
  switch (category) {
    case "starter":
      return "🚀 Quick Start";
    case "partner":
      return "🤝 Partner Presets";
    case "enterprise":
      return "🏢 Enterprise";
    default:
      return category;
  }
}
