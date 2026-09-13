import type { UiTheme } from "../api/types";

export function applyTheme(theme: UiTheme) {
  document.documentElement.dataset.theme = theme;
}
