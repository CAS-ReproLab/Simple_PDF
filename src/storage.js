(function () {
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    downloadBlob(blob, fileName);
  }

  function safeBaseName(fileName, fallback = "document") {
    return (fileName || fallback).replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_");
  }

  window.SimplePDFStorage = {
    readFileAsArrayBuffer,
    readFileAsText,
    downloadBlob,
    downloadJson,
    safeBaseName
  };
})();
