# Dark Mode Implementation Plan

## Goal

Add a simple light/dark theme toggle for the app chrome while keeping PDF page rendering faithful to the original document.

Dark mode should affect the toolbar, viewer background, sidebar, buttons, form controls, comments list, and toast styling. It should not invert or recolor the PDF canvas content.

## Proposed Changes

### 1. Centralize Theme Colors

Keep the current light theme variables in `styles/main.css` under `:root`.

Add a dark theme override using a body-level attribute:

```css
body[data-theme="dark"] {
  --bg: ...;
  --panel: ...;
  --ink: ...;
  --muted: ...;
  --line: ...;
  --accent: ...;
  --accent-dark: ...;
  --shadow: ...;
}
```

This keeps the theme easy to reason about and avoids scattered dark-mode exceptions.

### 2. Add a Toolbar Toggle

Add a small button to the existing toolbar in `index.html`, preferably with the view controls:

```html
<button id="theme-toggle-btn" type="button" aria-pressed="false">Dark</button>
```

The button should update its label and `aria-pressed` state when the theme changes.

### 3. Add a Small Theme Module

Create `src/theme.js` for theme behavior.

Suggested responsibilities:

- Read the saved theme from `localStorage`.
- Apply the theme to `document.body.dataset.theme`.
- Toggle between light and dark.
- Update the toggle button label and accessibility state.

Suggested storage key:

```js
simplepdf.theme
```

Keeping this in a separate module makes the behavior reusable and keeps `app.js` from accumulating unrelated UI state.

### 4. Wire Theme Into App Startup

Load `src/theme.js` in `index.html` before `src/app.js`.

In `src/app.js`:

- Add `themeToggleBtn` to the `elements` map.
- Initialize the saved theme when the app starts.
- Add a click handler that toggles the theme.

The theme code should be independent from PDF loading, annotation state, and export behavior.

### 5. Preserve PDF Appearance

Leave `.pdf-canvas` unchanged in dark mode.

The surrounding page area can become dark, but rendered PDF pages should stay white or whatever color the original PDF uses. This avoids surprising users and preserves document fidelity.

### 6. Tune Annotation Visibility

Highlights can stay yellow.

Check comment markers, selected outlines, sidebar selected states, and editor controls in both themes. Prefer variable-based colors for selected states so the app remains legible without special-case CSS.

## Files To Touch

- `index.html`
  - Add the theme toggle button.
  - Include `src/theme.js`.

- `styles/main.css`
  - Add dark theme variables.
  - Replace any hard-coded app chrome colors with variables where needed.
  - Keep PDF canvas rendering untouched.

- `src/theme.js`
  - New small module for theme persistence and application.

- `src/app.js`
  - Wire the toggle into existing startup/event handling.

- `README.md`
  - Add a short note after implementation that the app supports light/dark mode and remembers the setting locally.

## Verification Checklist

- App launches in light mode by default when no preference is saved.
- Toggle switches between light and dark immediately.
- Reloading the page preserves the selected theme.
- Toolbar, sidebar, comments list, editor, buttons, inputs, and toast are readable in both themes.
- PDF page content is not inverted or recolored.
- Highlights and comment markers remain visible in both themes.
- Mobile layout remains usable in both themes.
