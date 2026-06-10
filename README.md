# Simple PDF

A personal, browser-based PDF reader and annotation tool.

## Open the app in Brave

This app is a static web page. You do not need to install Node.js, run `npm install`, create an account, or host it online.

### Option 1: Open `index.html` directly

1. Open Brave.
2. Press `Ctrl+O` on Windows/Linux or `Command+O` on macOS.
3. Browse to the cloned `Simple_PDF` folder.
4. Select `index.html`.
5. Click `Open`.

You can also paste a `file:///` URL into Brave's address bar.

Linux example:

```text
file:///home/YOUR_USERNAME/PyProj/Simple_PDF/index.html
```

Windows example:

```text
file:///C:/Users/YOUR_USERNAME/Documents/Simple_PDF/index.html
```

macOS example:

```text
file:///Users/YOUR_USERNAME/Documents/Simple_PDF/index.html
```

Replace the example path with the actual location of your cloned repo.

### Option 2: Use Brave with a local server

If Brave opens the page but PDF loading does not work, local `file://` browser rules may be blocking PDF.js. In that case, run a local static server from the `Simple_PDF` folder:

```bash
python3 -m http.server 8000
```

Then open Brave and go to:

```text
http://localhost:8000
```

This still only runs on your computer. It does not publish the app to the internet.

## Features

- Open a local PDF.
- Render pages with PDF.js.
- Add rectangular highlights.
- Add point comments.
- Edit comment text and annotation colors.
- Remove annotations from the toolbar or the comments sidebar.
- Toggle light or dark mode, with the preference saved in this browser.
- Save annotations as JSON.
- Reload annotation JSON.
- Save an editable Simple PDF copy that restores annotations when reopened in this app.
- Export a flattened PDF copy with visual highlights and comment markers for ordinary PDF readers.
- Reopen exported PDFs in this app and restore the annotation sidebar when embedded annotation metadata is present.

## Notes

Use `Save PDF` when you want to keep working on the file in this app. This stores the annotation data inside the PDF, but does not burn the highlights into the page. When you reopen that PDF in Simple PDF, the right-side annotation list is restored and annotations can still be removed.

Use `Flatten PDF` when you want a copy that shows the highlights and comment markers in ordinary PDF readers. Flattened marks are painted into the PDF page. If you later reopen a flattened PDF in Simple PDF, the sidebar data can still be removed, but the already-painted marks remain visible because they are now part of the page content.

The app embeds its annotation JSON in saved/exported PDF metadata. Other PDF readers usually will not expose those comments as native interactive PDF comments.

The app uses browser-ready library files committed under `vendor/`.
