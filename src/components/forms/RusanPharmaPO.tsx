import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { generateMultiPagePDF, printMultiPage, paginateItems, getItemsPerPage } from "@/lib/pdfMultiPage";

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
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11.5pt', lineHeight: '1.35', padding: '20px 28px', height: '1123px' }}
      >
        {/* Header - No logo, text only */}
        {isFirstPage && (
          <>
            <div className="text-center" style={{ marginBottom: '4px' }}>
              <h1 className="font-black" style={{ fontSize: '26.5pt', color: '#000', letterSpacing: '2px', marginBottom: '0' }}>
                NAVJEEVAN HOSPITAL
              </h1>
              <p className="font-bold italic" style={{ fontSize: '11.5pt', color: '#333', margin: '0' }}>Healthcare with Compassion</p>
              <p className="font-semibold" style={{ fontSize: '10.5pt', color: '#333', margin: '2px 0 0 0' }}>
                Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
              </p>
              <p className="font-semibold" style={{ fontSize: '10.5pt', color: '#333', margin: '0' }}>
                Phone: 6284942412 | {doctorName || 'Dr. Metali Bhatti'} | Licence No: PSMHC/Pb./2024/863
              </p>
            </div>

            {/* Blue divider line */}
            <div style={{ borderBottom: '3px solid #003366', marginBottom: '10px' }}></div>

            {/* PURCHASE ORDER title */}
            <div className="text-center" style={{ marginBottom: '10px' }}>
              <h2 className="font-black" style={{ fontSize: '18.5pt', color: '#003366', letterSpacing: '1px' }}>
                PURCHASE ORDER {totalPages > 1 && `(Page ${pageIndex + 1}/${totalPages})`}
              </h2>
            </div>

            {/* PO Info - bordered box */}
            <div style={{ border: '1.5px solid #333', padding: '6px 10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span className="font-black" style={{ color: '#000' }}>PO Number: </span>
                <span className="font-bold" style={{ color: '#000' }}>NH-38-26-{getPONumberSuffix()}</span>
              </div>
              <div>
                <span className="font-black" style={{ color: '#000' }}>PO Date: </span>
                <span className="font-bold" style={{ color: '#000' }}>{formatDate(poDate)}</span>
              </div>
            </div>

            {/* Supplier - inline text */}
            <p className="font-semibold" style={{ fontSize: '11.5pt', marginBottom: '4px', color: '#000' }}>
              <span className="font-black">To:</span> RUSAN PHARMA LTD., Khasra No. 122/8, Central Hope Town, Selaqui, Dehradun, Uttarakhand - 248197
            </p>

            {/* Subject & Salutation */}
            <p className="font-black" style={{ fontSize: '11.5pt', marginBottom: '0', color: '#000' }}>Subject: Purchase Order</p>
            <p className="font-black" style={{ fontSize: '11.5pt', marginBottom: '4px', color: '#000' }}>Dear Sir/Madam,</p>
            <p className="font-semibold text-justify" style={{ fontSize: '11pt', marginBottom: '8px', color: '#000', lineHeight: '1.45' }}>
              We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on physically, payment of product shall be done through cheque to your bank account. the name and composition of product is given below. please do the supply earlier as possible.
            </p>
          </>
        )}

        {/* Continuation header for non-first pages */}
        {!isFirstPage && (
          <>
            <div className="text-center" style={{ marginBottom: '4px' }}>
              <h1 className="font-black" style={{ fontSize: '22.5pt', color: '#000', letterSpacing: '2px' }}>NAVJEEVAN HOSPITAL</h1>
              <p className="font-bold italic" style={{ fontSize: '10.5pt', color: '#333' }}>Healthcare with Compassion</p>
            </div>
            <div style={{ borderBottom: '3px solid #003366', marginBottom: '8px' }}></div>
            <div style={{ border: '1.5px solid #333', padding: '6px 10px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span className="font-black">PO Number: </span>
                <span className="font-bold">NH-38-26-{getPONumberSuffix()}</span>
              </div>
              <div>
                <span className="font-black">Date: </span>
                <span className="font-bold">{formatDate(poDate)}</span>
                <span style={{ color: '#777', marginLeft: '10px' }}>(Continued - Page {pageIndex + 1}/{totalPages})</span>
              </div>
            </div>
          </>
        )}

        {/* Items Table - matching PDF columns: S.No., Product Name, Composition, HSN Code, Qty., Amount */}
        <table className="w-full border-collapse" style={{ marginBottom: '6px', fontSize: '10.5pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#003366' }}>
              <th style={{ padding: '5px 4px', textAlign: 'center', color: '#ffffff', fontWeight: '800', border: '1px solid #003366', width: '6%' }}>S.No.</th>
              <th style={{ padding: '5px 4px', textAlign: 'left', color: '#ffffff', fontWeight: '800', border: '1px solid #003366', width: '18%' }}>Product Name</th>
              <th style={{ padding: '5px 4px', textAlign: 'center', color: '#ffffff', fontWeight: '800', border: '1px solid #003366', width: '36%' }}>Composition</th>
              <th style={{ padding: '5px 4px', textAlign: 'center', color: '#ffffff', fontWeight: '800', border: '1px solid #003366', width: '14%' }}>HSN Code</th>
              <th style={{ padding: '5px 4px', textAlign: 'center', color: '#ffffff', fontWeight: '800', border: '1px solid #003366', width: '10%' }}>Qty.</th>
              <th style={{ padding: '5px 4px', textAlign: 'center', color: '#ffffff', fontWeight: '800', border: '1px solid #003366', width: '12%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const stockItem = getStockItemDetails(item.stockItemId);
              const itemNumber = startIndex + index + 1;
              const qtyInStrips = item.qtyInStrips || item.quantity;
              const amount = item.totalPrice || (qtyInStrips * (item.unitPrice || 0));

              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontWeight: '600', color: '#000' }}>{itemNumber}.</td>
                  <td style={{ border: '1px solid #999', padding: '4px', fontWeight: '700', color: '#000' }}>{item.stockItemName}</td>
                  <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontWeight: '600', color: '#000' }}>{stockItem?.composition || '-'}</td>
                  <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontWeight: '600', color: '#000' }}>{stockItem?.batchNo || '-'}</td>
                  <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontWeight: '700', color: '#000' }}>{qtyInStrips.toLocaleString()}</td>
                  <td style={{ border: '1px solid #999', padding: '4px', textAlign: 'center', fontWeight: '700', color: '#000' }}>{amount.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Blue line after table */}
        <div style={{ borderBottom: '3px solid #003366', marginBottom: '8px' }}></div>

        {/* Undertaking & Signature - Only on last page */}
        {isLastPage && (
          <>
            <div style={{ marginBottom: '6px' }}>
              <p className="font-black" style={{ color: '#000', fontSize: '11.5pt', marginBottom: '4px' }}>UNDERTAKING:</p>
              <p className="font-semibold text-justify" style={{ fontSize: '11pt', lineHeight: '1.5', color: '#000' }}>
                We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND-248197 Our P.O. No: {getPONumberSuffix()}/A ({formatDate(poDate)}). These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No. PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or un-intentionally.
              </p>
            </div>

            {/* For Navjeevan Hospital */}
            <div style={{ marginBottom: '4px' }}>
              <p className="font-black" style={{ color: '#000', fontSize: '11.5pt', margin: '0' }}>For Navjeevan Hospital,</p>
              <p className="font-semibold" style={{ color: '#333', fontSize: '10.5pt', margin: '0' }}>Opp. New Bus Stand, G.T. Road, Sirhind</p>
            </div>

            {/* Stamp & Signature Box - matching PDF exactly */}
            <div className="flex-grow" style={{ display: 'flex', minHeight: '180px', marginBottom: '6px' }}>
              {/* Left side - Stamp area */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '8px' }}>
                <p className="font-semibold" style={{ color: '#555', fontSize: '10.5pt', textAlign: 'center' }}>Stamp</p>
              </div>
              {/* Right side - Signature area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '8px' }}>
                <p className="font-semibold" style={{ color: '#555', fontSize: '10.5pt', textAlign: 'center', margin: '0' }}>Doctor's Signature</p>
                <p className="font-bold" style={{ color: '#000', fontSize: '10.5pt', textAlign: 'center', margin: '0' }}>({doctorName || 'Dr. Metali Bhatti'})</p>
              </div>
            </div>
          </>
        )}

        {/* Footer - 3 column layout matching PDF */}
        <div style={{ marginTop: 'auto', display: 'flex', border: '1.5px solid #003366', fontSize: '9.5pt', fontWeight: '700', backgroundColor: '#003366', color: '#ffffff', borderRadius: '2px' }}>
          <div style={{ flex: '0 0 28%', padding: '6px 8px', borderRight: '1px solid #ffffff44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-black" style={{ fontSize: '10.5pt' }}>NAVJEEVAN HOSPITAL</span>
          </div>
          <div style={{ flex: '1', padding: '6px 8px', borderRight: '1px solid #ffffff44', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)</span>
          </div>
          <div style={{ flex: '0 0 28%', padding: '6px 8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>Ph: 6284942412 | {doctorName || 'Dr. Metali Bhatti'} | Lic: PSMHC/Pb./2024/863</span>
          </div>
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
