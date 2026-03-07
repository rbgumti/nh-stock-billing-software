import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { generateMultiPagePDF, printMultiPage, paginateItems, getItemsPerPage } from "@/lib/pdfMultiPage";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface RusanPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function RusanPharmaPO({ poNumber, poDate, items, stockItems, onClose }: RusanPharmaPOProps) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { firstPage, subsequentPages } = getItemsPerPage('rusan');
  const paginatedItems = paginateItems(items, firstPage, subsequentPages);
  const totalPages = paginatedItems.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getPONumberSuffix = () => {
    const match = poNumber.match(/(\d+)$/);
    return match ? parseInt(match[1]).toString() : poNumber;
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
  };

  const handlePrint = async () => {
    const validRefs = pageRefs.current.filter((ref): ref is HTMLDivElement => ref !== null);
    if (validRefs.length === 0) return;

    setIsGeneratingPDF(true);
    try {
      await printMultiPage(validRefs, `Purchase Order - ${poNumber}`);
    } catch (error) {
      console.error('Error preparing print:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    const validRefs = pageRefs.current.filter((ref): ref is HTMLDivElement => ref !== null);
    if (validRefs.length === 0) return;

    setIsGeneratingPDF(true);
    try {
      const sanitizedPONumber = poNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
      await generateMultiPagePDF(validRefs, {
        scale: 3,
        filename: `PO-${sanitizedPONumber}-Rusan-Pharma.pdf`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderPage = (pageItems: PurchaseOrderItem[], pageIndex: number, startIndex: number) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;

    return (
      <div
        key={pageIndex}
        ref={(el) => { pageRefs.current[pageIndex] = el; }}
        className="bg-white text-black flex flex-col mb-4"
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '12pt', lineHeight: '1.3', fontWeight: '600', padding: '14px 20px', height: '1123px' }}
      >
        {/* Header with Logo */}
        <div className="text-center pb-2 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366', marginBottom: '6px' }}>
          <div className="flex justify-center" style={{ marginBottom: '4px' }}>
            <img src={navjeevanLogo} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          <h1 className="font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px', fontSize: '20pt', marginBottom: '0' }}>
            NAVJEEVAN HOSPITAL
          </h1>
          <p className="font-bold italic" style={{ fontSize: '10pt', color: '#555', margin: '0' }}>Healthcare with Compassion</p>
          <p className="font-bold" style={{ fontSize: '10pt', color: '#333', margin: '0' }}>
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
          </p>
          <p className="font-bold" style={{ fontSize: '10pt', color: '#555', margin: '0' }}>Phone: 6284942412 | {doctorName} | Licence No: PSMHC/Pb./2024/863</p>
        </div>

        {/* PO Title Badge */}
        <div className="flex justify-center" style={{ margin: '6px 0' }}>
          <div className="text-white font-black tracking-widest" style={{ backgroundColor: '#003366', padding: '4px 24px', borderRadius: '6px', fontSize: '13pt' }}>
            PURCHASE ORDER {totalPages > 1 && `(Page ${pageIndex + 1}/${totalPages})`}
          </div>
        </div>

        {/* PO Info Grid */}
        {isFirstPage && (
          <>
            <div className="grid grid-cols-2 font-bold" style={{ backgroundColor: '#f0f7ff', border: '1.5px solid #003366', borderRadius: '6px', padding: '4px 8px', marginBottom: '8px', fontSize: '11pt' }}>
              <div className="flex">
                <span className="font-black" style={{ color: '#003366', minWidth: '90px' }}>PO Number:</span>
                <span className="font-black" style={{ color: '#111' }}>NH-25-26-{getPONumberSuffix()}</span>
              </div>
              <div className="flex">
                <span className="font-black" style={{ color: '#003366', minWidth: '90px' }}>PO Date:</span>
                <span className="font-bold" style={{ color: '#111' }}>{formatDate(poDate)}</span>
              </div>
            </div>

            {/* Supplier Box */}
            <div style={{ backgroundColor: '#e8f4fd', border: '1.5px solid #0066cc', borderRadius: '6px', padding: '4px 8px', marginBottom: '8px', fontSize: '11pt' }}>
              <span className="font-black" style={{ color: '#003366' }}>TO: </span>
              <span className="font-black" style={{ color: '#111' }}>RUSAN PHARMA LTD.</span>
              <span className="font-bold" style={{ color: '#333', marginLeft: '6px' }}>Khasra No. 122MI, Central Hope Town, Selaqui, Dehradun, Uttarakhand - 248197</span>
            </div>

            {/* Subject & Salutation */}
            <p className="font-bold" style={{ fontSize: '11pt', marginBottom: '4px' }}><span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span style={{ color: '#111' }}>Purchase Order</span></p>
            <p className="font-bold" style={{ fontSize: '11pt', marginBottom: '4px', color: '#111' }}>Dear Sir/Madam,</p>
            <p className="font-semibold text-justify" style={{ fontSize: '11pt', marginBottom: '6px', color: '#333', lineHeight: '1.4' }}>
              We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
            </p>
          </>
        )}

        {/* Continuation header for non-first pages */}
        {!isFirstPage && (
          <div className="font-bold" style={{ backgroundColor: '#f0f7ff', border: '1.5px solid #003366', borderRadius: '6px', padding: '4px 8px', marginBottom: '4px', fontSize: '11pt' }}>
            <span className="font-black" style={{ color: '#003366' }}>PO Number: </span>
            <span className="font-black" style={{ color: '#111' }}>NH-25-26-{getPONumberSuffix()}</span>
            <span className="font-black" style={{ color: '#003366', marginLeft: '16px' }}>Date: </span>
            <span className="font-bold" style={{ color: '#111' }}>{formatDate(poDate)}</span>
            <span style={{ color: '#777', marginLeft: '16px' }}>(Continued)</span>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border-collapse" style={{ marginBottom: '4px', fontSize: '10pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#003366' }}>
              <th style={{ padding: '4px 3px', textAlign: 'center', color: '#ffffff', fontWeight: '900', border: '1px solid #999', width: '5%' }}>Sr.</th>
              <th style={{ padding: '4px 3px', textAlign: 'left', color: '#ffffff', fontWeight: '900', border: '1px solid #999', width: '18%' }}>Product</th>
              <th style={{ padding: '4px 3px', textAlign: 'left', color: '#ffffff', fontWeight: '900', border: '1px solid #999', width: '37%' }}>Compositions</th>
              <th style={{ padding: '4px 3px', textAlign: 'center', color: '#ffffff', fontWeight: '900', border: '1px solid #999', width: '12%' }}>Pack</th>
              <th style={{ padding: '4px 3px', textAlign: 'center', color: '#ffffff', fontWeight: '900', border: '1px solid #999', width: '14%' }}>Strips</th>
              <th style={{ padding: '4px 3px', textAlign: 'center', color: '#ffffff', fontWeight: '900', border: '1px solid #999', width: '14%' }}>Tablets</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const stockItem = getStockItemDetails(item.stockItemId);
              const packing = item.packSize || stockItem?.packing || "10×10";
              const qtyInStrips = item.qtyInStrips || item.quantity;
              const qtyInTabs = item.qtyInTabs || (() => {
                const packingMatch = packing.match(/(\d+)[×x*](\d+)/i);
                const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
                return qtyInStrips * tabletsPerStrip;
              })();
              const itemNumber = startIndex + index + 1;
              
              return (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                  <td style={{ border: '1px solid #bbb', padding: '3px', textAlign: 'center', fontWeight: '700', color: '#111' }}>{itemNumber}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px', fontWeight: '900', color: '#111' }}>{item.stockItemName}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px', fontWeight: '700', color: '#333' }}>{stockItem?.composition || '-'}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px', textAlign: 'center', fontWeight: '700', color: '#333' }}>{packing.replace('*', '×')}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px', textAlign: 'center', fontWeight: '900', color: '#111' }}>{qtyInStrips.toLocaleString()}</td>
                  <td style={{ border: '1px solid #bbb', padding: '3px', textAlign: 'center', fontWeight: '900', color: '#111' }}>{qtyInTabs.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Undertaking & Signature - Only on last page */}
        {isLastPage && (
          <>
            <div style={{ marginTop: '4px' }}>
              <p className="font-black" style={{ color: '#003366', fontSize: '12pt', marginBottom: '3px' }}>UNDERTAKING:</p>
              <p className="font-semibold text-justify" style={{ fontSize: '11pt', lineHeight: '1.45', color: '#333' }}>
                We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND-248197 Our <span className="font-black">P.O. No: {getPONumberSuffix()}/A ({formatDate(poDate)})</span>. These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our <span className="font-black">License No. PSMHC/Punjab/2024/863</span> we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or un-intentionally.
              </p>
            </div>

            {/* Spacer for stamp and signature */}
            <div className="flex-grow" style={{ minHeight: '190px' }}></div>

            {/* For Navjeevan Hospital line - shifted down */}
            <div style={{ fontSize: '11pt', padding: '0 4px', marginBottom: '4px' }}>
              <p className="font-black" style={{ color: '#003366', fontSize: '12pt', margin: '0' }}>For Navjeevan Hospital,</p>
              <p className="font-bold" style={{ color: '#333', fontSize: '10pt', margin: '0' }}>Opp. New Bus Stand, G.T. Road, Sirhind</p>
            </div>

            {/* Doctor name and Date - pushed just above footer */}
            <div className="flex justify-between items-end" style={{ fontSize: '11pt', padding: '0 4px', marginBottom: '8px' }}>
              <div>
                <div style={{ paddingTop: '2px', borderTop: '2px solid #555', minWidth: '200px' }}>
                  <span className="font-black" style={{ color: '#111', fontSize: '14pt' }}>{doctorName}</span>
                  <p className="font-bold" style={{ color: '#555', fontSize: '10pt', margin: '0' }}>Navjeevan Hospital, Sirhind</p>
                  <p className="font-semibold italic" style={{ color: '#777', fontSize: '9pt', margin: '0' }}>(Signature & Stamp)</p>
                </div>
              </div>
              <div className="text-right">
                <div style={{ paddingTop: '2px', borderTop: '2px solid #555', minWidth: '180px' }}>
                  <span className="font-black" style={{ color: '#111', fontSize: '14pt' }}>Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer - using inline styles for html2canvas compatibility */}
        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10pt', fontWeight: '900', padding: '6px 0', backgroundColor: '#003366', color: '#ffffff', borderRadius: '4px' }}>
          <p style={{ margin: '0' }}>
            NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
          </p>
        </div>
      </div>
    );
  };

  const getStartIndex = (pageIndex: number) => {
    if (pageIndex === 0) return 0;
    return firstPage + (pageIndex - 1) * subsequentPages;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Rusan Pharma Purchase Order {totalPages > 1 && `(${totalPages} pages)`}</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="flex items-center gap-2" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                PDF
              </Button>
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div>
          {paginatedItems.map((pageItems, pageIndex) => 
            renderPage(pageItems, pageIndex, getStartIndex(pageIndex))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
