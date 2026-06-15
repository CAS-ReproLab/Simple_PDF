(function () {
  const pdfjsLib = window.pdfjsLib;

  if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
  }

  class PDFViewer {
    constructor(viewerElement) {
      this.viewerElement = viewerElement;
      this.pdfDocument = null;
      this.scale = 1;
      this.pages = new Map();
      this.renderJobId = 0;
    }

    async load(pdfBytes) {
      this.renderJobId += 1;
      this.clear();
      const data = new Uint8Array(pdfBytes.slice(0));
      this.pdfDocument = await pdfjsLib.getDocument({ data }).promise;
      await this.renderAll();
      return this.pdfDocument;
    }

    clear() {
      this.viewerElement.innerHTML = "";
      this.pages.clear();
    }

    async setScale(scale) {
      this.scale = Math.max(0.1, Math.min(2.5, scale));
      if (this.pdfDocument) {
        await this.renderAll();
      }
    }

    async renderAll() {
      const renderJobId = (this.renderJobId += 1);
      this.clear();

      for (let pageNumber = 1; pageNumber <= this.pdfDocument.numPages; pageNumber += 1) {
        const rendered = await this.renderPage(pageNumber, renderJobId);
        if (!rendered) {
          return;
        }
      }

      if (renderJobId === this.renderJobId) {
        this.viewerElement.dispatchEvent(new CustomEvent("pages-rendered"));
      }
    }

    async renderPage(pageNumber, renderJobId) {
      const page = await this.pdfDocument.getPage(pageNumber);
      if (renderJobId !== this.renderJobId) {
        return false;
      }

      const viewport = page.getViewport({ scale: this.scale });
      const outputScale = window.devicePixelRatio || 1;

      const pageElement = document.createElement("section");
      pageElement.className = "pdf-page";
      pageElement.dataset.page = String(pageNumber);
      pageElement.style.width = `${viewport.width}px`;
      pageElement.style.height = `${viewport.height}px`;

      const canvas = document.createElement("canvas");
      canvas.className = "pdf-canvas";
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const overlay = document.createElement("div");
      overlay.className = "annotation-layer";
      overlay.dataset.page = String(pageNumber);

      if (renderJobId !== this.renderJobId) {
        return false;
      }

      pageElement.append(canvas, overlay);
      this.viewerElement.append(pageElement);

      const context = canvas.getContext("2d");
      const renderContext = {
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
      };

      await page.render(renderContext).promise;
      if (renderJobId !== this.renderJobId) {
        pageElement.remove();
        return false;
      }

      this.pages.set(pageNumber, {
        page,
        pageElement,
        canvas,
        overlay,
        width: viewport.width,
        height: viewport.height
      });

      return true;
    }

    getPageInfo(pageNumber) {
      return this.pages.get(pageNumber);
    }

    getPageCount() {
      return this.pdfDocument ? this.pdfDocument.numPages : 0;
    }

    getFitWidthScale(availableWidth) {
      if (!this.pages.size || availableWidth <= 0) {
        return this.scale;
      }

      const widestPageWidth = Math.max(
        ...Array.from(this.pages.values(), (pageInfo) => pageInfo.width / this.scale)
      );

      return Math.max(0.1, Math.min(2.5, availableWidth / widestPageWidth));
    }
  }

  window.SimplePDFViewer = {
    PDFViewer
  };
})();
