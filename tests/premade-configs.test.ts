/**
 * Tests for the Premade Plugin Config system.
 */
import { describe, it, expect } from "@jest/globals";
import { PremadeConfig, PremadeConfigRegistry } from "../static/types/premade-configs";
import openSourceProject from "../static/premade-configs/open-source-project.json";
import bountyHunter from "../static/premade-configs/bounty-hunter.json";
import minimalStarter from "../static/premade-configs/minimal-starter.json";

const testRegistry: PremadeConfigRegistry = {
  "open-source-project": openSourceProject as PremadeConfig,
  "bounty-hunter": bountyHunter as PremadeConfig,
  "minimal-starter": minimalStarter as PremadeConfig,
};

describe("Premade Config Data Validation", () => {
  it("should have valid structure for all premade configs", () => {
    for (const [, config] of Object.entries(testRegistry)) {
      const c = config as PremadeConfig;
      expect(c.name).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.category).toMatch(/^(starter|partner|enterprise)$/);
      expect(Object.keys(c.plugins).length).toBeGreaterThan(0);

      for (const [, plugin] of Object.entries(c.plugins)) {
        expect(plugin.plugin).toBeTruthy();
        expect(plugin.with).toBeDefined();
        expect(typeof plugin.with).toBe("object");
      }
    }
  });

  it("should have unique plugin keys within each config", () => {
    for (const [, config] of Object.entries(testRegistry)) {
      const c = config as PremadeConfig;
      const keys = Object.keys(c.plugins);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    }
  });
});

describe("Premade Config Conversion", () => {
  function premadeConfigToPluginConfig(premade: PremadeConfig) {
    const plugins: { uses: { plugin: string; with: Record<string, unknown> }[] }[] = [];

    for (const [, entry] of Object.entries(premade.plugins)) {
      plugins.push({
        uses: [{ plugin: entry.plugin, with: entry.with }],
      });
    }

    return { plugins };
  }

  it("should convert open-source-project config to PluginConfig", () => {
    const config = testRegistry["open-source-project"] as PremadeConfig;
    const result = premadeConfigToPluginConfig(config);

    expect(result.plugins).toBeDefined();
    expect(result.plugins.length).toBe(Object.keys(config.plugins).length);

    for (const plugin of result.plugins) {
      expect(plugin.uses).toBeDefined();
      expect(plugin.uses.length).toBe(1);
      expect(plugin.uses[0].plugin).toBeTruthy();
      expect(plugin.uses[0].with).toBeDefined();
    }
  });

  it("should convert minimal-starter config correctly", () => {
    const config = testRegistry["minimal-starter"] as PremadeConfig;
    const result = premadeConfigToPluginConfig(config);

    expect(result.plugins.length).toBe(1);
    expect(result.plugins[0].uses[0].plugin).toContain("command-start-stop");
  });

  it("should convert bounty-hunter config with multiple plugins", () => {
    const config = testRegistry["bounty-hunter"] as PremadeConfig;
    const result = premadeConfigToPluginConfig(config);

    expect(result.plugins.length).toBe(3);
    const pluginNames = result.plugins.map((p) => p.uses[0].plugin);
    expect(pluginNames.some((p) => p.includes("command-start-stop"))).toBe(true);
    expect(pluginNames.some((p) => p.includes("daemon-pricing"))).toBe(true);
    expect(pluginNames.some((p) => p.includes("text-conversation-rewards"))).toBe(true);
  });
});

describe("Premade Config Categories", () => {
  it("should have correct categories", () => {
    expect((testRegistry["minimal-starter"] as PremadeConfig).category).toBe("starter");
    expect((testRegistry["open-source-project"] as PremadeConfig).category).toBe("partner");
    expect((testRegistry["bounty-hunter"] as PremadeConfig).category).toBe("partner");
  });

  it("should sort configs by category order", () => {
    const categoryOrder: Record<string, number> = { starter: 0, partner: 1, enterprise: 2 };
    const sorted = Object.entries(testRegistry).sort(
      (a, b) => (categoryOrder[(a[1] as PremadeConfig).category] ?? 99) - (categoryOrder[(b[1] as PremadeConfig).category] ?? 99)
    );

    const categories = sorted.map(([, c]) => (c as PremadeConfig).category);
    const starterIdx = categories.indexOf("starter");
    const partnerIdx = categories.indexOf("partner");
    expect(starterIdx).toBeLessThan(partnerIdx);
  });
});

describe("Premade Config Field Completeness", () => {
  it("should have all essential fields for command-start-stop", () => {
    for (const [, config] of Object.entries(testRegistry)) {
      const c = config as PremadeConfig;
      const commandConfig = c.plugins["command-start-stop"];
      if (commandConfig) {
        expect(commandConfig.with).toHaveProperty("reviewDelayTolerance");
        expect(commandConfig.with).toHaveProperty("taskStaleTimeoutDuration");
        expect(commandConfig.with).toHaveProperty("startRequiresWallet");
      }
    }
  });

  it("should have valid plugin URL formats", () => {
    for (const [, config] of Object.entries(testRegistry)) {
      const c = config as PremadeConfig;
      for (const [, plugin] of Object.entries(c.plugins)) {
        const url = plugin.plugin;
        expect(url.startsWith("https://") || url.includes("/")).toBe(true);
      }
    }
  });
});
