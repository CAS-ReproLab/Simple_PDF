(function () {
  const STORAGE_KEY = "simplepdf.theme";
  const LIGHT = "light";
  const DARK = "dark";

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === DARK ? DARK : LIGHT;
    } catch (error) {
      return LIGHT;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // The visual theme still works if localStorage is unavailable.
    }
  }

  function applyTheme(theme, toggleButton) {
    const nextTheme = theme === DARK ? DARK : LIGHT;
    document.body.dataset.theme = nextTheme;
    updateToggle(toggleButton, nextTheme);
    return nextTheme;
  }

  function toggleTheme(toggleButton) {
    const currentTheme = document.body.dataset.theme === DARK ? DARK : LIGHT;
    const nextTheme = currentTheme === DARK ? LIGHT : DARK;
    applyTheme(nextTheme, toggleButton);
    saveTheme(nextTheme);
    return nextTheme;
  }

  function initialize(toggleButton) {
    return applyTheme(getSavedTheme(), toggleButton);
  }

  function updateToggle(toggleButton, theme) {
    if (!toggleButton) {
      return;
    }

    const isDark = theme === DARK;
    toggleButton.textContent = isDark ? "Light" : "Dark";
    toggleButton.setAttribute("aria-pressed", String(isDark));
    toggleButton.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  }

  window.SimplePDFTheme = {
    initialize,
    toggleTheme,
    applyTheme,
    getSavedTheme
  };
})();
