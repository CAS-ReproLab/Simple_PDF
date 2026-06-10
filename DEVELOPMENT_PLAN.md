# Browser PDF Reader and Annotation Tool Development Plan

## 1. Project Goal

Build a simple personal browser-based PDF tool that lets the user open PDF files, read them comfortably, add highlights, attach comments, and save or export their work.

The first version should run from a cloned GitHub repository as a static app. It should not require hosting, accounts, a database, Node.js, npm, or project dependency installation.

The preferred run path is:

1. Clone the repository.
2. Open `index.html` in a modern browser.

If browser `file://` security rules interfere with PDF.js workers or local files, the fallback run path is:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## 2. Primary Features

### Version 1

- Upload a local PDF file.
- Render PDF pages in the browser.
- Navigate through pages by scrolling.
- Zoom in and out.
- Add rectangular highlights by dragging over a page.
- Add comments attached to highlights.
- Show comments in a sidebar.
- Edit and delete highlights/comments.
- Save annotations as a JSON file.
- Reload a PDF and matching JSON annotation file.

### Version 2

- Export a new PDF with visual highlights embedded.
- Add visible comment markers to exported PDFs.
- Improve text selection-based highlighting.
- Add undo/redo.
- Add search.
- Add page thumbnails.

### Later Enhancements

- Real PDF annotation objects where practical.
- Image insertion.
- Text box insertion.
- OCR support for scanned PDFs.
- Multi-document tabs.
- Local browser storage for recent annotation sessions.
- Optional Node.js backend for merging, conversion, storage, or user accounts.

## 3. Recommended Technology

### Frontend

- HTML for structure.
- CSS for layout, responsive behavior, and tool styling.
- JavaScript for PDF rendering, interaction, annotation state, and export.

### Libraries

- `PDF.js` for rendering PDF pages.
- `pdf-lib` for writing exported PDFs.

### Dependency Strategy

Use vendored browser builds of required JavaScript libraries inside the repository so the app can run without `npm install` and without relying on CDN availability.

Suggested approach:

- Store PDF.js browser files under `vendor/pdfjs/`.
- Store the PDF.js worker file under `vendor/pdfjs/`.
- Store the `pdf-lib` browser bundle under `vendor/pdf-lib/`.
- Reference those files directly from `index.html`.

CDN links can be useful during quick experiments, but the main committed version should work offline once cloned.

Avoid a JavaScript framework at first. Use plain HTML, CSS, and JavaScript modules unless the UI becomes complex enough to justify a build system.

## 4. Proposed File Structure

```text
Simple_PDF/
  index.html
  README.md
  DEVELOPMENT_PLAN.md
  src/
    app.js
    pdf-viewer.js
    annotations.js
    export-pdf.js
    storage.js
    ui.js
  styles/
    main.css
  assets/
    icons/
  vendor/
    pdfjs/
      pdf.min.js
      pdf.worker.min.js
    pdf-lib/
      pdf-lib.min.js
  samples/
```

The `vendor/` directory should contain browser-ready library files that are committed to the repo. This makes the project clone-and-run friendly.

## 5. Application Architecture

### PDF Loading Layer

Responsibilities:

- Accept a user-selected PDF file.
- Read the file into an `ArrayBuffer`.
- Store the original PDF bytes for later export.
- Load the file into PDF.js.
- Report page count and metadata to the UI.

Important state:

```js
{
  fileName: "document.pdf",
  pdfBytes: ArrayBuffer,
  pdfDocument: PDFDocumentProxy,
  pageCount: 12
}
```

### PDF Rendering Layer

Responsibilities:

- Render each page using PDF.js.
- Create one visual page container per PDF page.
- Place a PDF canvas at the bottom.
- Place an annotation overlay above the canvas.
- Re-render pages when zoom changes.

Each page should use this structure:

```html
<section class="pdf-page" data-page="1">
  <canvas class="pdf-canvas"></canvas>
  <div class="annotation-layer"></div>
</section>
```

### Annotation Layer

Responsibilities:

- Capture pointer events.
- Convert browser pointer coordinates into page-relative coordinates.
- Draw highlights and comment markers.
- Keep annotation positions stable across zoom changes.
- Support selecting, editing, and deleting annotations.

Store annotation coordinates in normalized page space rather than raw screen pixels. For example, `x`, `y`, `width`, and `height` should be fractions from `0` to `1`.

This allows annotations to survive zoom changes and different display sizes.

### UI Layer

Responsibilities:

- Toolbar controls.
- File upload.
- Active tool selection.
- Zoom controls.
- Download/export buttons.
- Comment sidebar.
- Modal or popover editor for comments.

Suggested toolbar controls:

- Open PDF
- Open annotations JSON
- Save annotations JSON
- Export PDF
- Select tool
- Highlight tool
- Comment tool
- Delete selected annotation
- Zoom out
- Zoom in
- Fit width

## 6. Annotation Data Model

Use a single annotation store in memory.

```js
{
  "version": 1,
  "document": {
    "fileName": "example.pdf",
    "fingerprint": "optional-document-id"
  },
  "annotations": [
    {
      "id": "ann_001",
      "type": "highlight",
      "page": 1,
      "rect": {
        "x": 0.18,
        "y": 0.42,
        "width": 0.34,
        "height": 0.03
      },
      "color": "#fff176",
      "opacity": 0.45,
      "comment": "Important definition.",
      "createdAt": "2026-06-10T12:00:00.000Z",
      "updatedAt": "2026-06-10T12:00:00.000Z"
    },
    {
      "id": "ann_002",
      "type": "comment",
      "page": 2,
      "point": {
        "x": 0.72,
        "y": 0.24
      },
      "comment": "Check this claim later.",
      "createdAt": "2026-06-10T12:05:00.000Z",
      "updatedAt": "2026-06-10T12:05:00.000Z"
    }
  ]
}
```

## 7. User Workflow

### Opening a PDF

1. User clicks `Open PDF`.
2. Browser file picker opens.
3. User selects a PDF.
4. App loads the file with PDF.js.
5. App renders all pages or renders pages lazily.
6. Toolbar and annotation controls become active.

### Adding a Highlight

1. User selects the highlight tool.
2. User drags across a page.
3. App draws a temporary rectangle while dragging.
4. On pointer release, app saves the highlight.
5. App opens a small comment editor.
6. User may enter a comment or leave it blank.
7. Highlight appears in the page overlay and sidebar.

### Adding a Standalone Comment

1. User selects the comment tool.
2. User clicks a point on the page.
3. App creates a comment marker.
4. App opens a comment editor.
5. Comment appears in the sidebar.

### Editing an Annotation

1. User clicks a highlight, comment marker, or sidebar item.
2. App selects the annotation.
3. App opens the comment editor.
4. User edits the comment, color, or deletes the annotation.
5. App updates the overlay and sidebar.

### Saving Work

1. User clicks `Save annotations`.
2. App serializes annotation state to JSON.
3. Browser downloads a `.json` file.

### Loading Existing Work

1. User opens the PDF.
2. User clicks `Open annotations`.
3. App validates the JSON structure.
4. App loads annotations into memory.
5. App redraws all annotation overlays.

## 8. Export Strategy

### Editable Save Approach

Use `pdf-lib` to save a copy of the PDF with Simple PDF annotation JSON embedded in PDF metadata.

This should be the default personal workflow:

- Original PDF page content is preserved.
- Highlights and comments are not burned into the page.
- Reopening the saved PDF in Simple PDF restores the sidebar and editable overlay annotations.
- Removing an annotation removes it from the overlay and from the next saved copy.

This approach is best for ongoing editing inside this app.

### Flattened Export Approach

Use `pdf-lib` to draw permanent visual marks into a copied PDF.

For each highlight:

- Convert normalized page coordinates back into PDF coordinate space.
- Draw a semi-transparent yellow rectangle.
- Preserve the original PDF page content.

For each comment:

- Draw a small visible marker near the annotation.
- Optionally add a numbered label.
- Optionally add a summary page at the end listing all comments by page.

This approach is useful for sharing with ordinary PDF readers, but it is intentionally destructive for the visual marks. Once a highlight is flattened into the PDF page, removing the sidebar annotation later cannot erase the already-painted mark from that flattened file.

### Later Export Approach

Investigate real PDF annotations:

- Text annotations.
- Highlight annotations.
- Popup annotations.

This may require lower-level PDF object handling and more compatibility testing.

## 9. Coordinate Handling

Browser coordinates and PDF coordinates differ.

Browser page overlay:

- Origin is top-left.
- `y` increases downward.

PDF coordinate space:

- Origin is usually bottom-left.
- `y` increases upward.

Plan:

1. Store annotations in normalized browser-style page coordinates.
2. Use normalized coordinates for rendering overlays.
3. Convert to PDF coordinates only during export.

Example export conversion:

```js
const pdfX = rect.x * pageWidth;
const pdfY = pageHeight - ((rect.y + rect.height) * pageHeight);
const pdfWidth = rect.width * pageWidth;
const pdfHeight = rect.height * pageHeight;
```

## 10. Development Milestones

### Milestone 1: Static App Shell

- Create `index.html`.
- Create `styles/main.css`.
- Add vendored PDF.js and `pdf-lib` browser files under `vendor/`.
- Wire `index.html` to local `vendor/` scripts instead of CDN or npm-managed imports.
- Create a toolbar, viewer area, and comments sidebar.
- Add disabled controls before a PDF is loaded.

Definition of done:

- Page opens directly from `index.html` where supported.
- Page also works through `python3 -m http.server 8000`.
- Layout is usable on desktop.
- Empty document state is clear.

### Milestone 2: PDF Upload and Rendering

- Add PDF file input.
- Load PDF with PDF.js.
- Render pages to canvases.
- Add zoom controls.

Definition of done:

- User can open a PDF.
- All pages render.
- Zoom changes page size without breaking layout.

### Milestone 3: Annotation Overlay

- Add overlay layer above each page canvas.
- Capture pointer events.
- Draw temporary drag rectangle.
- Save normalized highlight rectangles.
- Redraw highlights after zoom.

Definition of done:

- User can drag to create highlights.
- Highlights remain aligned after zoom changes.

### Milestone 4: Comments

- Add comment editor popover or sidebar editor.
- Attach comment text to highlights.
- Add standalone comment markers.
- Add sidebar list.
- Support edit and delete.

Definition of done:

- User can create, edit, and delete comments.
- Sidebar and page overlays stay synchronized.

### Milestone 5: Save and Load JSON

- Serialize annotation state.
- Download annotation JSON.
- Load annotation JSON.
- Validate schema version.

Definition of done:

- User can close and reopen an annotation session using the PDF plus JSON file.

### Milestone 6: Export Annotated PDF

- Integrate `pdf-lib`.
- Draw highlight rectangles into copied PDF pages.
- Draw comment markers.
- Download annotated PDF.

Definition of done:

- Exported PDF opens in common PDF readers.
- Highlight positions match the browser view closely.

### Milestone 7: Polish and Reliability

- Improve keyboard accessibility.
- Add loading and error states.
- Add undo/redo.
- Add responsive layout behavior.
- Add test PDFs.
- Document known limitations.

Definition of done:

- App feels stable for ordinary PDFs.
- Common failure modes produce helpful messages.

## 11. Testing Plan

### Manual Test Cases

- Open `index.html` directly from the cloned folder.
- Open the app through `python3 -m http.server 8000`.
- Open a one-page PDF.
- Open a multi-page PDF.
- Open a large PDF.
- Zoom in and out after creating highlights.
- Add a highlight near each page edge.
- Add multiple comments on the same page.
- Edit and delete annotations.
- Save JSON, reload the browser, reload PDF and JSON.
- Export annotated PDF and inspect output.

### Compatibility Targets

- Current Chrome.
- Current Firefox.
- Current Edge.

### Test Documents

Keep sample PDFs that cover:

- Text-heavy pages.
- Pages with images.
- Different page sizes.
- Rotated pages.
- Scanned/image-only pages.

## 12. Known Risks

- Text selection highlighting is harder than rectangular highlighting.
- Native PDF comments can be inconsistent across readers.
- Export coordinate conversion can be tricky, especially for rotated pages.
- Very large PDFs may need lazy page rendering for performance.
- Scanned PDFs do not contain selectable text unless OCR is added.

## 13. Initial Implementation Recommendation

Start with a frontend-only prototype.

Build rectangular highlighting and JSON persistence before attempting native PDF annotation export. This keeps the first version useful while avoiding the most complex PDF internals early in development.

After that works, add `pdf-lib` export so users can produce a shareable annotated PDF.
