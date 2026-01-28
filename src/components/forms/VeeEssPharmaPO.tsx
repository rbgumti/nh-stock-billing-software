import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { generateMultiPagePDF, printMultiPage, paginateItems, getItemsPerPage } from "@/lib/pdfMultiPage";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface VeeEssPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VeeEssPharmaPO({ poNumber, poDate, items, stockItems, onClose }: VeeEssPharmaPOProps) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { firstPage, subsequentPages } = getItemsPerPage('veeess');
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
        filename: `PO-${sanitizedPONumber}-VEE-ESS-Pharma.pdf`
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
        className="p-6 bg-white text-black flex flex-col mb-4"
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13pt', lineHeight: '1.6', fontWeight: '600', minHeight: '1123px', height: '1123px' }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-4 pb-3 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366' }}>
          <div className="flex justify-center mb-2">
            <img src={navjeevanLogo} alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px' }}>
            NAVJEEVAN HOSPITAL
          </h1>
          <p className="text-sm font-bold italic text-gray-700 mt-1">Healthcare with Compassion</p>
          <p className="text-sm font-bold text-gray-800 mt-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
          </p>
          <p className="text-xs font-bold text-gray-700 mt-0.5">Phone: 6284942412 | {doctorName}</p>
          <p className="text-xs font-bold text-gray-700">Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab</p>
        </div>

        {/* PO Title Badge */}
        <div className="flex justify-center mb-4">
          <div className="px-8 py-2.5 rounded-lg text-white font-black text-lg tracking-widest shadow-md" style={{ backgroundColor: '#003366' }}>
            PURCHASE ORDER {totalPages > 1 && `(Page ${pageIndex + 1}/${totalPages})`}
          </div>
        </div>

        {/* PO Info Grid - Only on first page */}
        {isFirstPage && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4 p-4 rounded-lg text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
              <div className="flex">
                <span className="font-black min-w-[110px]" style={{ color: '#003366' }}>PO Number:</span>
                <span className="font-black text-gray-900">{poNumber}</span>
              </div>
              <div className="flex">
                <span className="font-black min-w-[110px]" style={{ color: '#003366' }}>PO Date:</span>
                <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
              </div>
            </div>

            {/* Supplier Box */}
            <div className="p-4 mb-4 rounded-lg text-base" style={{ backgroundColor: '#e8f4fd', border: '2px solid #0066cc' }}>
              <span className="font-black" style={{ color: '#003366' }}>TO: </span>
              <span className="font-black text-gray-900">VEE ESS PHARMACEUTICALS</span>
              <p className="text-gray-800 font-bold mt-1">Patran Road DRB, Sangrur, Punjab - 148035</p>
            </div>

            {/* Subject & Salutation */}
            <p className="text-base font-bold mb-2"><span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Medicine Order</span></p>
            <p className="text-base font-bold mb-3 text-gray-900">Dear Sir/Madam,</p>
            <p className="text-base font-semibold text-justify mb-4 text-gray-800">
              Kindly provide us the following medicines for our centre Navjeevan Hospital at the below written address at the earliest.
            </p>
          </>
        )}

        {/* Continuation header for non-first pages */}
        {!isFirstPage && (
          <div className="mb-4 p-3 rounded-lg text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
            <span className="font-black" style={{ color: '#003366' }}>PO Number: </span>
            <span className="font-black text-gray-900">{poNumber}</span>
            <span className="ml-6 font-black" style={{ color: '#003366' }}>Date: </span>
            <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
            <span className="ml-6 text-gray-600">(Continued)</span>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border-collapse mb-4 text-base" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#003366' }}>
              <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[10%]">Sr.</th>
              <th className="p-3 text-left text-white font-black border-2 border-gray-400 w-[50%]">Product Name</th>
              <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[20%]">Pack</th>
              <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[20%]">Qty.</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const stockItem = getStockItemDetails(item.stockItemId);
              const packing = stockItem?.packing || "10×10";
              const itemNumber = startIndex + index + 1;
              
              return (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                  <td className="border-2 border-gray-400 p-3 text-center font-bold text-gray-900">{itemNumber}</td>
                  <td className="border-2 border-gray-400 p-3 font-black text-gray-900">{item.stockItemName}</td>
                  <td className="border-2 border-gray-400 p-3 text-center font-bold text-gray-800">{packing}</td>
                  <td className="border-2 border-gray-400 p-3 text-center font-black text-gray-900">{item.quantity} TAB</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Flex spacer to push content to fill page */}
        <div className="flex-grow min-h-24"></div>

        {/* Footer Section - Only on last page */}
        {isLastPage && (
          <div className="mt-auto">
            <p className="text-base font-bold text-gray-800 mb-4">
              <span className="font-black" style={{ color: '#003366' }}>Address:</span> Navjeevan Hospital, Opp. Bus Stand, Vill. Bara, Sirhind, Distt. Fatehgarh Sahib.
            </p>

            {/* Signature Section */}
            <div className="flex justify-between text-base px-2">
              <div className="text-left">
                <p className="text-gray-800 font-bold">Thanking You,</p>
                <p className="text-gray-800 font-bold mb-2">Yours Sincerely,</p>
                <div className="mt-20 pt-3 border-t-2 border-gray-600 min-w-[220px]">
                  <span className="font-black text-gray-900 text-lg">{doctorName}</span>
                  <p className="text-gray-700 text-sm font-bold">Navjeevan Hospital, Sirhind</p>
                  <p className="text-gray-600 text-xs font-semibold italic mt-1">(Signature & Stamp)</p>
                </div>
              </div>
              <div className="text-center min-w-[160px]">
                <div className="mt-20 pt-3 border-t-2 border-gray-600">
                  <span className="font-black text-gray-900 text-lg">Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm font-black pt-3" style={{ borderTop: '3px solid #003366' }}>
          <p style={{ color: '#003366' }}>
            NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
          </p>
        </div>
      </div>
    );
  };

  // Calculate start index for each page
  const getStartIndex = (pageIndex: number) => {
    if (pageIndex === 0) return 0;
    return firstPage + (pageIndex - 1) * subsequentPages;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>VEE ESS Pharmaceuticals Purchase Order {totalPages > 1 && `(${totalPages} pages)`}</span>
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