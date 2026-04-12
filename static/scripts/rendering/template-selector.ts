import { createElement } from "../../utils/element-helpers";
import { STRINGS } from "../../utils/strings";
import { toastNotification } from "../../utils/toaster";
import { configTemplateHandler } from "../predefined-configs/template-handler";
import { renderPremadeConfigSelector } from "../predefined-configs/premade-config-handler";
import { ManifestRenderer } from "../render-manifest";
import { controlButtons } from "./control-buttons";
import { renderPluginSelector } from "./plugin-select";
import { updateGuiTitle } from "./utils";

export function renderTemplateSelector(renderer: ManifestRenderer): void {
  renderer.currentStep = "templateSelector";
  controlButtons({ hide: true });
  renderer.manifestGui?.classList.add("rendering");
  renderer.manifestGuiBody.innerHTML = null;

  const templateRow = document.createElement("tr");
  const templateCell = document.createElement("td");
  templateCell.colSpan = 4;
  templateCell.className = STRINGS.TDV_CENTERED;

  const templateButtons = createElement("div", { class: "template-buttons" });

  const premadeButton = createElement("button", { textContent: "Premade Configs", class: "template-btn-premade" });
  premadeButton.addEventListener("click", () => {
    renderPremadeConfigSelector(renderer);
  });

  const minimalButton = createElement("button", { textContent: "Minimal" });
  minimalButton.addEventListener("click", () => {
    configTemplateHandler("minimal", renderer).catch(console.error);
  });

  const fullDefaultButton = createElement("button", { textContent: "Full Default" });
  fullDefaultButton.addEventListener("click", () => {
    configTemplateHandler("full-defaults", renderer).catch(console.error);
  });

  const customButton = createElement("button", { textContent: "Custom" });
  customButton.addEventListener("click", () => {
    const selectedOrg = localStorage.getItem("selectedOrg");
    if (!selectedOrg) {
      throw new Error("No org selected");
    }
    fetchOrgConfig(renderer, selectedOrg).catch(console.error);
  });

  templateButtons.appendChild(premadeButton);
  templateButtons.appendChild(minimalButton);
  templateButtons.appendChild(fullDefaultButton);
  templateButtons.appendChild(customButton);

  templateCell.appendChild(templateButtons);
  templateRow.appendChild(templateCell);

  renderer.manifestGuiBody.appendChild(templateRow);

  updateGuiTitle("Select a Template");

  renderer.manifestGui?.classList.remove("rendering");
  renderer.manifestGui?.classList.add("rendered");
}

async function fetchOrgConfig(renderer: ManifestRenderer, org: string): Promise<void> {
  const removeToast = toastNotification("Fetching organization config...", { type: "info", shouldAutoDismiss: true });
  const octokit = renderer.auth.octokit;
  if (!octokit) {
    throw new Error("No org or octokit found");
  }
  await renderer.configParser.fetchUserInstalledConfig(org, octokit);
  renderPluginSelector(renderer);
  removeToast();
}
