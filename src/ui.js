(function () {
  function getPointInOverlay(event, overlay) {
    const rect = overlay.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  }

  function applyRect(element, rect) {
    element.style.left = `${rect.x * 100}%`;
    element.style.top = `${rect.y * 100}%`;
    element.style.width = `${rect.width * 100}%`;
    element.style.height = `${rect.height * 100}%`;
  }

  function scrollToPageAnnotation(annotationId) {
    const element = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  window.SimplePDFUI = {
    getPointInOverlay,
    applyRect,
    scrollToPageAnnotation,
    showToast
  };
})();
