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
    }

    async load(pdfBytes) {
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
      this.scale = Math.max(0.5, Math.min(2.5, scale));
      if (this.pdfDocument) {
        await this.renderAll();
      }
    }

    async renderAll() {
      this.clear();

      for (let pageNumber = 1; pageNumber <= this.pdfDocument.numPages; pageNumber += 1) {
        await this.renderPage(pageNumber);
      }

      this.viewerElement.dispatchEvent(new CustomEvent("pages-rendered"));
    }

    async renderPage(pageNumber) {
      const page = await this.pdfDocument.getPage(pageNumber);
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

      pageElement.append(canvas, overlay);
      this.viewerElement.append(pageElement);

      const context = canvas.getContext("2d");
      const renderContext = {
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
      };

      await page.render(renderContext).promise;

      this.pages.set(pageNumber, {
        page,
        pageElement,
        canvas,
        overlay,
        width: viewport.width,
        height: viewport.height
      });
    }

    getPageInfo(pageNumber) {
      return this.pages.get(pageNumber);
    }

    getPageCount() {
      return this.pdfDocument ? this.pdfDocument.numPages : 0;
    }

    getFitWidthScale(containerWidth) {
      const firstPage = this.pages.get(1);
      if (!firstPage) {
        return this.scale;
      }

      const padding = 48;
      return Math.max(0.5, Math.min(2.5, (containerWidth - padding) / (firstPage.width / this.scale)));
    }
  }

  window.SimplePDFViewer = {
    PDFViewer
  };
})();
