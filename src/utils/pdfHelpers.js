const getContentType = (headers = {}) => {
  const contentType = headers['content-type'] || headers['Content-Type'] || '';
  return String(contentType).toLowerCase();
};

const extractErrorMessageFromBlob = async (blob) => {
  try {
    const text = await blob.text();
    if (!text) return '';

    try {
      const parsed = JSON.parse(text);
      return parsed?.error || parsed?.message || text;
    } catch {
      return text;
    }
  } catch {
    return '';
  }
};

const ensurePdfBlob = async (response, fallbackMessage = 'Failed to load PDF') => {
  const raw = response?.data;
  const blob = raw instanceof Blob ? raw : new Blob([raw]);
  const contentType = getContentType(response?.headers);
  const blobType = String(blob.type || '').toLowerCase();
  const isPdf = contentType.includes('application/pdf') || blobType.includes('application/pdf');

  if (!isPdf) {
    const serverMessage = await extractErrorMessageFromBlob(blob);
    throw new Error(serverMessage || fallbackMessage);
  }

  return new Blob([blob], { type: 'application/pdf' });
};

export const openPdfFromResponse = async (response, fallbackMessage = 'Failed to open PDF') => {
  const pdfBlob = await ensurePdfBlob(response, fallbackMessage);
  const url = window.URL.createObjectURL(pdfBlob);
  window.open(url, '_blank', 'noopener,noreferrer');

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 60000);
};

export const printPdfFromResponse = async (response, fallbackMessage = 'Failed to print PDF') => {
  const pdfBlob = await ensurePdfBlob(response, fallbackMessage);
  const url = window.URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    window.URL.revokeObjectURL(url);
    throw new Error('Popup blocked. Please allow popups to print.');
  }

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // noop
    }
  }, 700);

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 60000);
};

export const downloadPdfFromResponse = async (
  response,
  fileName,
  fallbackMessage = 'Failed to download PDF'
) => {
  const pdfBlob = await ensurePdfBlob(response, fallbackMessage);
  const url = window.URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 5000);
};
