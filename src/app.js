(function () {
  const Annotations = window.SimplePDFAnnotations;
  const Storage = window.SimplePDFStorage;
  const Exporter = window.SimplePDFExport;
  const UI = window.SimplePDFUI;
  const Theme = window.SimplePDFTheme;
  const { PDFViewer } = window.SimplePDFViewer;

  const elements = {
    openPdfBtn: document.getElementById("open-pdf-btn"),
    openAnnotationsBtn: document.getElementById("open-annotations-btn"),
    saveAnnotationsBtn: document.getElementById("save-annotations-btn"),
    exportPdfBtn: document.getElementById("export-pdf-btn"),
    flattenPdfBtn: document.getElementById("flatten-pdf-btn"),
    pdfInput: document.getElementById("pdf-input"),
    annotationsInput: document.getElementById("annotations-input"),
    viewer: document.getElementById("viewer"),
    viewerPanel: document.querySelector(".viewer-panel"),
    sidebar: document.querySelector(".sidebar"),
    emptyState: document.getElementById("empty-state"),
    toolButtons: Array.from(document.querySelectorAll(".tool-button")),
    deleteBtn: document.getElementById("delete-annotation-btn"),
    zoomOutBtn: document.getElementById("zoom-out-btn"),
    zoomInBtn: document.getElementById("zoom-in-btn"),
    fitWidthBtn: document.getElementById("fit-width-btn"),
    sidebarResizer: document.getElementById("sidebar-resizer"),
    commentFontSize: document.getElementById("comment-font-size"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    zoomLabel: document.getElementById("zoom-label"),
    commentsList: document.getElementById("comments-list"),
    editorEmpty: document.getElementById("editor-empty"),
    editor: document.getElementById("annotation-editor"),
    commentText: document.getElementById("comment-text"),
    annotationColor: document.getElementById("annotation-color")
  };

  const viewer = new PDFViewer(elements.viewer);
  let annotations = Annotations.createStore();
  let pdfBytes = null;
  let activeTool = "select";
  let selectedAnnotationId = "";
  let currentFileName = "";
  let dragState = null;
  let sidebarResizeState = null;

  const preferences = {
    sidebarWidthKey: "simplePdf.sidebarWidth",
    commentFontSizeKey: "simplePdf.commentFontSize",
    defaultSidebarWidth: 320,
    minSidebarWidth: 240,
    maxSidebarWidth: 640,
    defaultCommentFontSize: 14
  };

  elements.openPdfBtn.addEventListener("click", () => elements.pdfInput.click());
  elements.openAnnotationsBtn.addEventListener("click", () => elements.annotationsInput.click());
  elements.saveAnnotationsBtn.addEventListener("click", saveAnnotations);
  elements.exportPdfBtn.addEventListener("click", () => exportPdf({ flatten: false }));
  elements.flattenPdfBtn.addEventListener("click", () => exportPdf({ flatten: true }));
  elements.pdfInput.addEventListener("change", openPdf);
  elements.annotationsInput.addEventListener("change", openAnnotations);
  elements.viewer.addEventListener("pages-rendered", renderAnnotations);
  elements.viewer.addEventListener("pointerdown", handlePointerDown);
  elements.viewer.addEventListener("click", handleViewerClick);
  elements.editor.addEventListener("submit", updateSelectedAnnotation);
  elements.deleteBtn.addEventListener("click", deleteSelectedAnnotation);
  elements.zoomOutBtn.addEventListener("click", () => updateZoom(viewer.scale - 0.15));
  elements.zoomInBtn.addEventListener("click", () => updateZoom(viewer.scale + 0.15));
  elements.fitWidthBtn.addEventListener("click", fitWidth);
  elements.sidebarResizer.addEventListener("pointerdown", startSidebarResize);
  elements.sidebarResizer.addEventListener("keydown", resizeSidebarWithKeyboard);
  elements.commentFontSize.addEventListener("input", updateCommentFontSize);
  elements.themeToggleBtn.addEventListener("click", () => Theme.toggleTheme(elements.themeToggleBtn));

  elements.toolButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTool(button.dataset.tool));
  });

  async function openPdf(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      UI.showToast("Loading PDF...");
      pdfBytes = await Storage.readFileAsArrayBuffer(file);
      currentFileName = file.name;
      annotations = Annotations.createStore();
      annotations.document.fileName = file.name;
      selectedAnnotationId = "";

      const embeddedAnnotations = await Exporter.readEmbeddedAnnotations(pdfBytes);
      if (embeddedAnnotations) {
        annotations = Annotations.validateImport(embeddedAnnotations);
        annotations.document.fileName = file.name;
      }

      await viewer.load(pdfBytes);
      elements.emptyState.classList.add("is-hidden");
      setControlsEnabled(true);
      updateZoomLabel();
      renderAll();
      if (embeddedAnnotations && embeddedAnnotations.exportInfo && embeddedAnnotations.exportInfo.flattened) {
        UI.showToast("Opened flattened PDF. Sidebar annotations can be removed, but baked-in marks stay visible.");
      } else {
        UI.showToast(embeddedAnnotations ? `Opened ${file.name} with embedded annotations` : `Opened ${file.name}`);
      }
    } catch (error) {
      console.error(error);
      UI.showToast("Could not open that PDF.");
    } finally {
      elements.pdfInput.value = "";
    }
  }

  async function openAnnotations(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const text = await Storage.readFileAsText(file);
      annotations = Annotations.validateImport(JSON.parse(text));
      selectedAnnotationId = "";
      renderAll();
      UI.showToast(`Loaded ${annotations.annotations.length} annotations`);
    } catch (error) {
      console.error(error);
      UI.showToast(error.message || "Could not load annotation JSON.");
    } finally {
      elements.annotationsInput.value = "";
    }
  }

  function saveAnnotations() {
    const baseName = Storage.safeBaseName(currentFileName);
    Storage.downloadJson(annotations, `${baseName}.annotations.json`);
    UI.showToast("Annotation JSON saved.");
  }

  async function exportPdf({ flatten }) {
    if (!pdfBytes) {
      return;
    }

    try {
      elements.exportPdfBtn.disabled = true;
      elements.flattenPdfBtn.disabled = true;
      UI.showToast(flatten ? "Flattening PDF..." : "Saving editable PDF...");
      const bytes = await Exporter.exportAnnotatedPdf(pdfBytes, annotations, { flatten });
      const baseName = Storage.safeBaseName(currentFileName);
      const suffix = flatten ? "flattened" : "simplepdf";
      Storage.downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${baseName}.${suffix}.pdf`);
      UI.showToast(flatten ? "Flattened PDF exported." : "Editable PDF saved.");
    } catch (error) {
      console.error(error);
      UI.showToast("Could not export PDF.");
    } finally {
      elements.exportPdfBtn.disabled = !pdfBytes;
      elements.flattenPdfBtn.disabled = !pdfBytes;
    }
  }

  function handleViewerClick(event) {
    const annotationElement = event.target.closest(".annotation");
    if (annotationElement) {
      selectAnnotation(annotationElement.dataset.annotationId);
      return;
    }

    if (activeTool === "comment") {
      const overlay = event.target.closest(".annotation-layer");
      if (!overlay) {
        return;
      }

      const page = Number(overlay.dataset.page);
      const point = UI.getPointInOverlay(event, overlay);
      const annotation = Annotations.createComment(page, point);
      annotations.annotations.push(annotation);
      selectAnnotation(annotation.id);
      renderAll();
    } else if (activeTool === "select") {
      selectAnnotation("");
    }
  }

  function handlePointerDown(event) {
    if (activeTool !== "highlight") {
      return;
    }

    const overlay = event.target.closest(".annotation-layer");
    if (!overlay || event.target.closest(".annotation")) {
      return;
    }

    event.preventDefault();
    const start = UI.getPointInOverlay(event, overlay);
    const draft = document.createElement("div");
    draft.className = "draft-highlight";
    overlay.append(draft);

    dragState = {
      page: Number(overlay.dataset.page),
      overlay,
      start,
      end: start,
      draft
    };

    overlay.setPointerCapture(event.pointerId);
    overlay.addEventListener("pointermove", handlePointerMove);
    overlay.addEventListener("pointerup", handlePointerUp);
    overlay.addEventListener("pointercancel", cancelDrag);
  }

  function handlePointerMove(event) {
    if (!dragState) {
      return;
    }

    dragState.end = UI.getPointInOverlay(event, dragState.overlay);
    UI.applyRect(dragState.draft, Annotations.normalizeRect(dragState.start, dragState.end));
  }

  function handlePointerUp(event) {
    if (!dragState) {
      return;
    }

    const rect = Annotations.normalizeRect(dragState.start, UI.getPointInOverlay(event, dragState.overlay));
    const overlay = dragState.overlay;
    const page = dragState.page;
    cleanupDrag();

    if (rect.width < 0.006 || rect.height < 0.006) {
      return;
    }

    const annotation = Annotations.createHighlight(page || Number(overlay.dataset.page), rect);
    annotations.annotations.push(annotation);
    selectAnnotation(annotation.id);
    renderAll();
  }

  function cancelDrag() {
    cleanupDrag();
  }

  function cleanupDrag() {
    if (!dragState) {
      return;
    }

    dragState.draft.remove();
    dragState.overlay.removeEventListener("pointermove", handlePointerMove);
    dragState.overlay.removeEventListener("pointerup", handlePointerUp);
    dragState.overlay.removeEventListener("pointercancel", cancelDrag);
    dragState = null;
  }

  function updateSelectedAnnotation(event) {
    event.preventDefault();
    const annotation = getSelectedAnnotation();
    if (!annotation) {
      return;
    }

    annotation.comment = elements.commentText.value.trim();
    annotation.color = elements.annotationColor.value;
    annotation.updatedAt = Annotations.now();
    renderAll();
    UI.showToast("Annotation updated.");
  }

  function deleteSelectedAnnotation() {
    if (!selectedAnnotationId) {
      return;
    }

    removeAnnotation(selectedAnnotationId);
  }

  async function updateZoom(scale) {
    await viewer.setScale(scale);
    updateZoomLabel();
    renderAll();
  }

  async function fitWidth() {
    const scale = viewer.getFitWidthScale(getViewerPanelContentWidth());
    await updateZoom(scale);
    resetHorizontalViewerScroll();
  }

  function getViewerPanelContentWidth() {
    const styles = window.getComputedStyle(elements.viewerPanel);
    const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    return elements.viewerPanel.clientWidth - horizontalPadding;
  }

  function resetHorizontalViewerScroll() {
    requestAnimationFrame(() => {
      elements.viewerPanel.scrollLeft = 0;
    });
  }

  function startSidebarResize(event) {
    if (window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    event.preventDefault();
    sidebarResizeState = {
      pointerId: event.pointerId
    };
    document.body.classList.add("is-resizing-sidebar");
    elements.sidebarResizer.setPointerCapture(event.pointerId);
    elements.sidebarResizer.addEventListener("pointermove", resizeSidebar);
    elements.sidebarResizer.addEventListener("pointerup", stopSidebarResize);
    elements.sidebarResizer.addEventListener("pointercancel", stopSidebarResize);
  }

  function resizeSidebar(event) {
    if (!sidebarResizeState || event.pointerId !== sidebarResizeState.pointerId) {
      return;
    }

    setSidebarWidth(window.innerWidth - event.clientX);
  }

  function stopSidebarResize(event) {
    if (!sidebarResizeState || event.pointerId !== sidebarResizeState.pointerId) {
      return;
    }

    elements.sidebarResizer.removeEventListener("pointermove", resizeSidebar);
    elements.sidebarResizer.removeEventListener("pointerup", stopSidebarResize);
    elements.sidebarResizer.removeEventListener("pointercancel", stopSidebarResize);
    document.body.classList.remove("is-resizing-sidebar");
    sidebarResizeState = null;
  }

  function resizeSidebarWithKeyboard(event) {
    const keySteps = {
      ArrowLeft: 16,
      ArrowRight: -16,
      Home: preferences.maxSidebarWidth,
      End: preferences.minSidebarWidth
    };

    if (!(event.key in keySteps)) {
      return;
    }

    event.preventDefault();
    const currentWidth = getCurrentSidebarWidth();
    const width = event.key === "Home" || event.key === "End" ? keySteps[event.key] : currentWidth + keySteps[event.key];
    setSidebarWidth(width);
  }

  function getCurrentSidebarWidth() {
    return elements.viewerPanel.parentElement.getBoundingClientRect().right - elements.sidebar.getBoundingClientRect().left;
  }

  function setSidebarWidth(width) {
    const maxWidth = Math.min(preferences.maxSidebarWidth, Math.round(window.innerWidth * 0.6));
    const nextWidth = clamp(width, preferences.minSidebarWidth, maxWidth);
    document.documentElement.style.setProperty("--sidebar-width", `${nextWidth}px`);
    elements.sidebarResizer.setAttribute("aria-valuemax", String(maxWidth));
    elements.sidebarResizer.setAttribute("aria-valuenow", String(nextWidth));
    writePreference(preferences.sidebarWidthKey, nextWidth);
  }

  function updateCommentFontSize() {
    const fontSize = clamp(Number(elements.commentFontSize.value), 12, 20);
    document.documentElement.style.setProperty("--comment-font-size", `${fontSize}px`);
    writePreference(preferences.commentFontSizeKey, fontSize);
  }

  function initializePreferences() {
    const storedSidebarWidth = readPreference(preferences.sidebarWidthKey, preferences.defaultSidebarWidth);
    const storedCommentFontSize = readPreference(preferences.commentFontSizeKey, preferences.defaultCommentFontSize);

    setSidebarWidth(storedSidebarWidth);
    elements.commentFontSize.value = String(clamp(storedCommentFontSize, 12, 20));
    updateCommentFontSize();
  }

  function readPreference(key, fallback) {
    try {
      return Number(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writePreference(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (error) {
      // Preferences are helpful, but the app should still work when storage is unavailable.
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function renderAll() {
    renderAnnotations();
    renderSidebar();
    renderEditor();
  }

  function renderAnnotations() {
    viewer.pages.forEach(({ overlay }, pageNumber) => {
      overlay.innerHTML = "";

      annotations.annotations
        .filter((annotation) => annotation.page === pageNumber)
        .forEach((annotation) => {
          const element = document.createElement("button");
          element.type = "button";
          element.className = `annotation ${annotation.type}`;
          element.dataset.annotationId = annotation.id;
          element.title = annotation.comment || annotation.type;
          element.setAttribute("aria-label", `${annotation.type} on page ${annotation.page}`);

          if (annotation.id === selectedAnnotationId) {
            element.classList.add("is-selected");
          }

          if (annotation.type === "highlight" && annotation.rect) {
            UI.applyRect(element, annotation.rect);
            element.style.backgroundColor = annotation.color || Annotations.DEFAULT_COLOR;
            element.style.opacity = String(annotation.opacity || 0.45);
          }

          if (annotation.type === "comment" && annotation.point) {
            element.style.left = `${annotation.point.x * 100}%`;
            element.style.top = `${annotation.point.y * 100}%`;
            element.style.backgroundColor = annotation.color || "#256f6c";
          }

          overlay.append(element);
        });
    });
  }

  function renderSidebar() {
    elements.commentsList.innerHTML = "";

    const sorted = [...annotations.annotations].sort((a, b) => a.page - b.page);
    if (!sorted.length) {
      const item = document.createElement("li");
      item.className = "muted";
      item.textContent = "No annotations yet.";
      elements.commentsList.append(item);
      return;
    }

    sorted.forEach((annotation) => {
      const item = document.createElement("li");
      item.className = "comment-item";
      if (annotation.id === selectedAnnotationId) {
        item.classList.add("is-selected");
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "comment-select-button";
      button.dataset.annotationId = annotation.id;
      button.innerHTML = `
        <span class="comment-page">Page ${annotation.page} · ${annotation.type}</span>
        <span class="comment-text">${escapeHtml(annotation.comment || "No comment")}</span>
      `;
      button.addEventListener("click", () => {
        selectAnnotation(annotation.id);
        UI.scrollToPageAnnotation(annotation.id);
      });

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "comment-remove-button";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${annotation.type} on page ${annotation.page}`);
      removeButton.addEventListener("click", () => {
        removeAnnotation(annotation.id);
      });

      item.append(button, removeButton);
      elements.commentsList.append(item);
    });
  }

  function renderEditor() {
    const annotation = getSelectedAnnotation();
    elements.deleteBtn.disabled = !annotation;

    if (!annotation) {
      elements.editor.classList.add("is-hidden");
      elements.editorEmpty.classList.remove("is-hidden");
      elements.commentText.value = "";
      return;
    }

    elements.editor.classList.remove("is-hidden");
    elements.editorEmpty.classList.add("is-hidden");
    elements.commentText.value = annotation.comment || "";
    elements.annotationColor.value = annotation.color || (annotation.type === "highlight" ? Annotations.DEFAULT_COLOR : "#256f6c");
  }

  function selectAnnotation(id) {
    selectedAnnotationId = id || "";
    renderAll();
  }

  function removeAnnotation(id) {
    annotations.annotations = annotations.annotations.filter((annotation) => annotation.id !== id);
    if (selectedAnnotationId === id) {
      selectedAnnotationId = "";
    }
    renderAll();
    UI.showToast("Annotation removed.");
  }

  function getSelectedAnnotation() {
    return annotations.annotations.find((annotation) => annotation.id === selectedAnnotationId);
  }

  function setActiveTool(tool) {
    activeTool = tool;
    elements.toolButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tool === tool);
    });
  }

  function setControlsEnabled(enabled) {
    [
      elements.openAnnotationsBtn,
      elements.saveAnnotationsBtn,
      elements.exportPdfBtn,
      elements.flattenPdfBtn,
      elements.zoomOutBtn,
      elements.zoomInBtn,
      elements.fitWidthBtn
    ].forEach((button) => {
      button.disabled = !enabled;
    });
  }

  function updateZoomLabel() {
    elements.zoomLabel.textContent = `${Math.round(viewer.scale * 100)}%`;
  }

  function escapeHtml(value) {
    const container = document.createElement("div");
    container.textContent = value;
    return container.innerHTML;
  }

  Theme.initialize(elements.themeToggleBtn);
  initializePreferences();
  renderSidebar();
})();
