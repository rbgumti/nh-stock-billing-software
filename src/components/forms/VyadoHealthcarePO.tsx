import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { generateMultiPagePDF, printMultiPage, paginateItems, getItemsPerPage } from "@/lib/pdfMultiPage";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface VyadoHealthcarePOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VyadoHealthcarePO({ poNumber, poDate, items, stockItems, onClose }: VyadoHealthcarePOProps) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { firstPage, subsequentPages } = getItemsPerPage('vyado');
  const paginatedItems = paginateItems(items, firstPage, subsequentPages);
  const totalPages = paginatedItems.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
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
        filename: `PO-${sanitizedPONumber}-VYADO-Healthcare.pdf`
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
        className="p-5 bg-white text-black flex flex-col mb-4"
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '12pt', lineHeight: '1.4', fontWeight: '600' }}
      >
        {/* Header with Logo - Compact */}
        <div className="text-center mb-3 pb-2 border-b-2" style={{ borderColor: '#003366' }}>
          <div className="flex justify-center mb-1">
            <img src={navjeevanLogo} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '0.5px' }}>
            NAVJEEVAN HOSPITAL
          </h1>
          <p className="text-xs font-bold text-gray-800 mt-0.5">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab) | Ph: 6284942412
          </p>
          <p className="text-[10px] font-bold text-gray-700">Licence No: PSMHC/Pb./2024/863 | {doctorName}</p>
        </div>

        {/* PO Title Badge - Compact */}
        <div className="flex justify-center mb-3">
          <div className="px-6 py-1.5 rounded text-white font-black text-sm tracking-widest shadow-sm" style={{ backgroundColor: '#003366' }}>
            PURCHASE ORDER {totalPages > 1 && `(Page ${pageIndex + 1}/${totalPages})`}
          </div>
        </div>

        {/* PO Info Grid */}
        {isFirstPage && (
          <>
            <div className="flex justify-between mb-3 p-2.5 rounded text-sm font-bold" style={{ backgroundColor: '#f0f7ff', border: '1.5px solid #003366' }}>
              <div>
                <span className="font-black" style={{ color: '#003366' }}>PO No: </span>
                <span className="font-black text-gray-900">{poNumber}</span>
              </div>
              <div>
                <span className="font-black" style={{ color: '#003366' }}>Date: </span>
                <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
              </div>
            </div>

            {/* Supplier Box */}
            <div className="p-2.5 mb-3 rounded text-sm" style={{ backgroundColor: '#e8f4fd', border: '1.5px solid #0066cc' }}>
              <span className="font-black" style={{ color: '#003366' }}>TO: </span>
              <span className="font-black text-gray-900">VYADO HEALTHCARE PVT LTD</span>
              <span className="text-gray-800 font-bold ml-2">| Gali No.4, Vinod Nagar, Hisar - 125001</span>
            </div>

            {/* Subject */}
            <p className="text-sm mb-1 font-bold">
              <span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Medicine Order</span>
            </p>
            <p className="text-xs text-gray-800 mb-3 font-semibold">
              Kindly supply the following medicines to Navjeevan Hospital, Bara Sirhind at the earliest.
            </p>
          </>
        )}

        {/* Continuation header for non-first pages */}
        {!isFirstPage && (
          <div className="mb-3 p-2 rounded text-sm font-bold" style={{ backgroundColor: '#f0f7ff', border: '1.5px solid #003366' }}>
            <span className="font-black" style={{ color: '#003366' }}>PO No: </span>
            <span className="font-black text-gray-900">{poNumber}</span>
            <span className="ml-4 font-black" style={{ color: '#003366' }}>Date: </span>
            <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
            <span className="ml-4 text-gray-600">(Continued)</span>
          </div>
        )}

        {/* Items Table - Compact */}
        <table className="w-full border-collapse mb-3 text-sm">
          <thead>
            <tr style={{ backgroundColor: '#003366' }}>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[8%]">Sr.</th>
              <th className="p-2 text-left text-white font-black border border-gray-400 w-[50%]">Product Name</th>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[20%]">Packing</th>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[22%]">Qty.</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const stockItem = getStockItemDetails(item.stockItemId);
              const packing = stockItem?.packing || "10×10";
              const itemNumber = startIndex + index + 1;
              
              return (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                  <td className="border border-gray-400 p-1.5 text-center font-bold text-gray-900">{itemNumber}</td>
                  <td className="border border-gray-400 p-1.5 font-black text-gray-900">{item.stockItemName}</td>
                  <td className="border border-gray-400 p-1.5 text-center font-bold text-gray-800">{packing}</td>
                  <td className="border border-gray-400 p-1.5 text-center font-black text-gray-900">{item.quantity} TAB</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature Section - Only on last page, compact */}
        {isLastPage && (
          <div className="mt-4">
            <div className="pt-2" style={{ borderTop: '1.5px solid #003366' }}>
              <p className="text-gray-800 font-bold text-xs">Thanking You,</p>
              <p className="text-gray-800 font-bold text-xs">Yours Sincerely,</p>
            </div>
            
            {/* Signature Section - Two columns */}
            <div className="flex justify-between text-sm mt-2">
              {/* Left Column - Doctor Details */}
              <div className="text-left">
                {/* Space for signature & stamp */}
                <div className="min-h-[50px]"></div>
                <div className="pt-1.5 border-t border-gray-600 min-w-[180px]">
                  <span className="font-black text-sm" style={{ color: '#003366' }}>{doctorName}</span>
                  <p className="text-gray-700 text-xs font-bold">Navjeevan Hospital, Sirhind</p>
                  <p className="text-gray-600 text-[10px] font-semibold italic">(Signature & Stamp)</p>
                </div>
              </div>
              {/* Right Column - Date with signature line */}
              <div className="text-right flex flex-col justify-end">
                {/* Space for signature */}
                <div className="min-h-[50px]"></div>
                <div className="pt-1.5 border-t border-gray-600 min-w-[140px]">
                  <span className="font-black text-sm" style={{ color: '#003366' }}>Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Compact */}
        <div className="mt-3 text-center text-xs font-black py-1.5 px-3 rounded" style={{ backgroundColor: '#003366' }}>
          <p className="text-white">
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
            <span>VYADO Healthcare Purchase Order {totalPages > 1 && `(${totalPages} pages)`}</span>
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
