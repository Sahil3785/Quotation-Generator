import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function containsUnsupportedColor(v?: string | null) {
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s.includes('oklch(') || s.includes('oklab(') || s.includes('lab(') || s.includes('color(');
}

export async function generateQuotationPDF(elementId: string): Promise<Blob> {
  const element = document.getElementById(elementId) as HTMLElement | null;
  if (!element) throw new Error("Quotation element not found");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    imageTimeout: 0,
    logging: false,
    backgroundColor: '#ffffff',
    foreignObjectRendering: false,
    ignoreElements: (el) => (el as HTMLElement).id === "action-footer",
    onclone: (doc) => {
      const cloned = doc.getElementById(elementId) as HTMLElement | null;
      // Ensure outer backgrounds never use modern color functions
      try {
        (doc.documentElement as any).style.backgroundColor = '#ffffff';
        (doc.body as any).style.backgroundColor = '#ffffff';
      } catch {}
      if (cloned) {
        cloned.style.width = "1200px";
        cloned.style.maxWidth = "1200px";
        cloned.style.overflow = "visible";

        // Normalize color functions across the entire cloned document, not just content
        const all = Array.from(doc.querySelectorAll('*')) as HTMLElement[];
        for (const el of all) {
          const cs = doc.defaultView?.getComputedStyle(el);
          if (!cs) continue;
          const bg = cs.backgroundColor;
          const bd = cs.borderColor;
          const tx = cs.color;
          if (containsUnsupportedColor(bg)) el.style.backgroundColor = '#ffffff';
          if (containsUnsupportedColor(bd)) el.style.borderColor = '#e5e7eb';
          if (containsUnsupportedColor(tx)) el.style.color = '#1f2937';
          // Gradients/complex backgrounds -> force to white
          const bgi = cs.backgroundImage;
          if (bgi && bgi !== 'none' && bgi.includes('gradient(')) el.style.backgroundImage = 'none';
          if (cs.filter && cs.filter !== 'none') el.style.filter = 'none';
          if (cs.boxShadow && cs.boxShadow !== 'none') el.style.boxShadow = 'none';
        }
      }
      const tableWrapper = cloned?.querySelector('.overflow-x-auto') as HTMLElement | null;
      if (tableWrapper) tableWrapper.style.overflow = 'visible';
      const qrPreview = doc.getElementById('qr-code-preview') as HTMLImageElement | null;
      if (qrPreview && qrPreview.src && !qrPreview.classList.contains('hidden')) qrPreview.style.display = 'block';
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pdfWidth - 2 * margin;

  const canvasAspectRatio = canvasHeight / canvasWidth;
  const imgHeightOnPdf = usableWidth * canvasAspectRatio;
  let heightLeft = imgHeightOnPdf;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeightOnPdf);
  heightLeft -= pdfHeight - 2 * margin;

  while (heightLeft > 0) {
    pdf.addPage();
    position -= pdfHeight - 2 * margin;
    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeightOnPdf);
    heightLeft -= pdfHeight - 2 * margin;
  }

  return pdf.output("blob");
}

export function downloadPdf(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export async function sharePdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  // @ts-ignore
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    // @ts-ignore
    await navigator.share({ title: filename, files: [file] });
    return true;
  } else {
    const dummy = document.createElement('input');
    document.body.appendChild(dummy);
    dummy.value = window.location.href;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    return false;
  }
}
