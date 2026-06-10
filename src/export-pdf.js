(function () {
  const ANNOTATION_METADATA_PREFIX = "SimplePDFAnnotations:v1:";

  async function exportAnnotatedPdf(pdfBytes, annotationState, options = {}) {
    const shouldFlatten = Boolean(options.flatten);
    const { PDFDocument, rgb } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const comments = [];

    embedAnnotationState(pdfDoc, annotationState, { flattened: shouldFlatten });

    if (shouldFlatten) {
      annotationState.annotations.forEach((annotation) => {
        const page = pages[annotation.page - 1];
        if (!page) {
          return;
        }

        const { width, height } = page.getSize();

        if (annotation.type === "highlight" && annotation.rect) {
          const rect = annotation.rect;
          const color = hexToRgb(annotation.color || "#fff176");

          page.drawRectangle({
            x: rect.x * width,
            y: height - (rect.y + rect.height) * height,
            width: rect.width * width,
            height: rect.height * height,
            color: rgb(color.r, color.g, color.b),
            opacity: annotation.opacity || 0.35,
            borderOpacity: 0
          });

          if (annotation.comment) {
            comments.push(annotation);
          }
        }

        if (annotation.type === "comment" && annotation.point) {
          const point = annotation.point;
          const color = hexToRgb(annotation.color || "#256f6c");
          const x = point.x * width;
          const y = height - point.y * height;

          page.drawCircle({
            x,
            y,
            size: 6,
            color: rgb(color.r, color.g, color.b),
            opacity: 0.95
          });

          if (annotation.comment) {
            comments.push(annotation);
          }
        }
      });
    }

    if (shouldFlatten && comments.length) {
      await addCommentSummary(pdfDoc, comments);
    }

    return pdfDoc.save();
  }

  async function readEmbeddedAnnotations(pdfBytes) {
    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const subject = pdfDoc.getSubject() || "";

      if (!subject.startsWith(ANNOTATION_METADATA_PREFIX)) {
        return null;
      }

      const encoded = subject.slice(ANNOTATION_METADATA_PREFIX.length);
      return JSON.parse(decodeBase64Json(encoded));
    } catch (error) {
      console.warn("Could not read embedded Simple PDF annotations.", error);
      return null;
    }
  }

  function embedAnnotationState(pdfDoc, annotationState, exportInfo) {
    const payload = {
      version: annotationState.version,
      document: annotationState.document,
      annotations: annotationState.annotations,
      exportInfo
    };

    pdfDoc.setSubject(`${ANNOTATION_METADATA_PREFIX}${encodeBase64Json(payload)}`);
  }

  async function addCommentSummary(pdfDoc, comments) {
    const { StandardFonts, rgb } = window.PDFLib;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let page = pdfDoc.addPage([612, 792]);
    let y = 748;

    page.drawText("Annotation Comments", {
      x: 48,
      y,
      size: 18,
      font,
      color: rgb(0.12, 0.16, 0.2)
    });

    y -= 32;

    comments.forEach((annotation) => {
      const label = `Page ${annotation.page}: ${annotation.comment || "(no comment)"}`;
      const lines = wrapText(label, 88);
      lines.forEach((line) => {
        if (y < 48) {
          page = pdfDoc.addPage([612, 792]);
          y = 748;
        }

        page.drawText(line, {
          x: 48,
          y,
          size: 10,
          font,
          color: rgb(0.12, 0.16, 0.2)
        });
        y -= 14;
      });
      y -= 8;
    });
  }

  function wrapText(text, maxLength) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const number = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);

    return {
      r: ((number >> 16) & 255) / 255,
      g: ((number >> 8) & 255) / 255,
      b: (number & 255) / 255
    };
  }

  function encodeBase64Json(value) {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let binary = "";

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }

  function decodeBase64Json(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder().decode(bytes);
  }

  window.SimplePDFExport = {
    exportAnnotatedPdf,
    readEmbeddedAnnotations
  };
})();
