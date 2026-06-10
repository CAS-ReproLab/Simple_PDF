(function () {
  const DEFAULT_COLOR = "#fff176";

  function createStore() {
    return {
      version: 1,
      document: {
        fileName: "",
        fingerprint: ""
      },
      annotations: []
    };
  }

  function makeId() {
    if (window.crypto && window.crypto.randomUUID) {
      return `ann_${window.crypto.randomUUID()}`;
    }

    return `ann_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function now() {
    return new Date().toISOString();
  }

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeRect(start, end) {
    const x = clamp(Math.min(start.x, end.x));
    const y = clamp(Math.min(start.y, end.y));
    const right = clamp(Math.max(start.x, end.x));
    const bottom = clamp(Math.max(start.y, end.y));

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y)
    };
  }

  function createHighlight(page, rect, color = DEFAULT_COLOR) {
    const timestamp = now();

    return {
      id: makeId(),
      type: "highlight",
      page,
      rect,
      color,
      opacity: 0.45,
      comment: "",
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function createComment(page, point) {
    const timestamp = now();

    return {
      id: makeId(),
      type: "comment",
      page,
      point: {
        x: clamp(point.x),
        y: clamp(point.y)
      },
      comment: "",
      color: "#256f6c",
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function validateImport(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.annotations)) {
      throw new Error("This annotation file is not in the expected format.");
    }

    return {
      version: 1,
      document: data.document || { fileName: "", fingerprint: "" },
      annotations: data.annotations.filter((annotation) => annotation && annotation.id && annotation.type)
    };
  }

  window.SimplePDFAnnotations = {
    DEFAULT_COLOR,
    createStore,
    createHighlight,
    createComment,
    normalizeRect,
    validateImport,
    now
  };
})();
