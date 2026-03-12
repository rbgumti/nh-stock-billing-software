import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface MultiPagePDFOptions {
  scale?: number;
  filename: string;
}

/**
 * Generates a multi-page PDF from an array of page elements.
 * Each element is rendered to a separate page in the PDF.
 */
export async function generateMultiPagePDF(
  pageElements: HTMLElement[],
  options: MultiPagePDFOptions
): Promise<void> {
  const { scale = 3, filename } = options;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  for (let i = 0; i < pageElements.length; i++) {
    const element = pageElements[i];
    
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions to fit in printable content area
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Scale down if content exceeds printable height
    let renderWidth = imgWidth;
    let renderHeight = imgHeight;
    let xOffset = 0;
    
    if (renderHeight > contentHeight) {
      const scaleFactor = contentHeight / renderHeight;
      renderHeight = contentHeight;
      renderWidth = renderWidth * scaleFactor;
      xOffset = (contentWidth - renderWidth) / 2;
    }

    if (i > 0) {
      pdf.addPage();
    }
    
    pdf.addImage(imgData, 'PNG', margin + xOffset, margin, renderWidth, renderHeight);
  }

  pdf.save(filename);
}

/**
 * Opens a print window with multiple page images
 */
export async function printMultiPage(
  pageElements: HTMLElement[],
  title: string
): Promise<void> {
  const images: string[] = [];
  
  for (const element of pageElements) {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    images.push(canvas.toDataURL('image/png'));
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const imagesHtml = images.map(img => `<img src="${img}" />`).join('<div class="page-break"></div>');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 10mm; }
          body { 
            display: flex; 
            flex-direction: column;
            align-items: center; 
          }
          img { 
            max-width: 190mm; 
            max-height: 277mm; 
            width: auto; 
            height: auto; 
            object-fit: contain;
            margin-bottom: 10mm;
          }
          .page-break {
            page-break-after: always;
            height: 0;
          }
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            img { margin-bottom: 0; }
          }
        </style>
      </head>
      <body>
        ${imagesHtml}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

/**
 * Calculate how many items can fit per page based on document type
 * Returns the number of items that fit on first page and subsequent pages
 */
export function getItemsPerPage(documentType: 'neuroglam' | 'rusan' | 'parb' | 'vyado' | 'veeess' | 'generic'): { firstPage: number; subsequentPages: number } {
  // Different PO formats have different content densities
  switch (documentType) {
    case 'neuroglam':
      // This format has undertaking text which takes more space
      return { firstPage: 8, subsequentPages: 18 };
    case 'rusan':
      // Increased font sizes + undertaking/signature/footer need extra space
      return { firstPage: 6, subsequentPages: 14 };
    case 'parb':
      return { firstPage: 8, subsequentPages: 18 };
    case 'vyado':
    case 'veeess':
      // Simpler formats with more table space
      return { firstPage: 10, subsequentPages: 20 };
    default:
      return { firstPage: 10, subsequentPages: 18 };
  }
}

/**
 * Split items into pages
 */
export function paginateItems<T>(items: T[], firstPageCount: number, subsequentPageCount: number): T[][] {
  if (items.length <= firstPageCount) {
    return [items];
  }
  
  const pages: T[][] = [];
  
  // First page
  pages.push(items.slice(0, firstPageCount));
  
  // Remaining pages
  let remaining = items.slice(firstPageCount);
  while (remaining.length > 0) {
    pages.push(remaining.slice(0, subsequentPageCount));
    remaining = remaining.slice(subsequentPageCount);
  }
  
  return pages;
}
