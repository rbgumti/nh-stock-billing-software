import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import { generateMultiPagePDF, printMultiPage, paginateItems, getItemsPerPage } from "@/lib/pdfMultiPage";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface NeuroglamPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function NeuroglamPO({ poNumber, poDate, items, stockItems, onClose }: NeuroglamPOProps) {
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { firstPage, subsequentPages } = getItemsPerPage('neuroglam');
  const paginatedItems = paginateItems(items, firstPage, subsequentPages);
  const totalPages = paginatedItems.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
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
        filename: `PO-${sanitizedPONumber}-Neuroglam.pdf`
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
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13pt', lineHeight: '1.5', fontWeight: '600', minHeight: '1123px', height: '1123px' }}
      >
        {/* Header with Logo */}
        <div className="text-center mb-3 pb-2 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366' }}>
          <div className="flex justify-center mb-1">
            <img src={navjeevanLogo} alt="Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px' }}>
            NAVJEEVAN HOSPITAL
          </h1>
          <p className="text-sm font-bold italic text-gray-700">Healthcare with Compassion</p>
          <p className="text-sm font-bold text-gray-800">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
          </p>
          <p className="text-sm font-bold text-gray-700">Phone: 6284942412 | {doctorName}</p>
          <p className="text-sm font-bold text-gray-700">Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab</p>
        </div>

        {/* PO Title Badge */}
        <div className="flex justify-center mb-3">
          <div className="px-8 py-2 rounded-lg text-white font-black text-lg tracking-widest shadow-md" style={{ backgroundColor: '#003366' }}>
            PURCHASE ORDER {totalPages > 1 && `(Page ${pageIndex + 1}/${totalPages})`}
          </div>
        </div>

        {/* PO Info Grid */}
        {isFirstPage && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-lg text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
              <div className="flex">
                <span className="font-black min-w-[100px]" style={{ color: '#003366' }}>PO Number:</span>
                <span className="font-black text-gray-900">{poNumber}</span>
              </div>
              <div className="flex">
                <span className="font-black min-w-[100px]" style={{ color: '#003366' }}>PO Date:</span>
                <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
              </div>
            </div>

            {/* Supplier Box */}
            <div className="p-3 mb-3 rounded-lg text-base" style={{ backgroundColor: '#e8f4fd', border: '2px solid #0066cc' }}>
              <span className="font-black" style={{ color: '#003366' }}>TO: </span>
              <span className="font-black text-gray-900">NEUROGLAM</span>
              <span className="text-gray-800 font-bold ml-2">Village – Ajnoud, Tehsil – Payal, Ludhiana – 141421 (Punjab)</span>
            </div>

            {/* Subject & Salutation */}
            <p className="text-base font-bold mb-1"><span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Purchase Order</span></p>
            <p className="text-base font-bold mb-2 text-gray-900">Dear Sir/Madam,</p>
            <p className="text-sm font-semibold text-justify mb-3 text-gray-800" style={{ lineHeight: '1.4' }}>
              We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion telephonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
            </p>
          </>
        )}

        {/* Continuation header for non-first pages */}
        {!isFirstPage && (
          <div className="mb-3 p-3 rounded-lg text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
            <span className="font-black" style={{ color: '#003366' }}>PO Number: </span>
            <span className="font-black text-gray-900">{poNumber}</span>
            <span className="ml-6 font-black" style={{ color: '#003366' }}>Date: </span>
            <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
            <span className="ml-6 text-gray-600">(Continued)</span>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border-collapse text-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#003366' }}>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[5%]">Sr.</th>
              <th className="p-2 text-left text-white font-black border border-gray-400 w-[18%]">Product</th>
              <th className="p-2 text-left text-white font-black border border-gray-400 w-[37%]">Compositions</th>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[12%]">Pack</th>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[14%]">Strips</th>
              <th className="p-2 text-center text-white font-black border border-gray-400 w-[14%]">Tablets</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, index) => {
              const stockItem = getStockItemDetails(item.stockItemId);
              const packing = item.packSize || stockItem?.packing || "10×10";
              const qtyInStrips = item.qtyInStrips || item.quantity;
              const qtyInTabs = item.qtyInTabs || qtyInStrips * 10;
              const itemNumber = startIndex + index + 1;
              
              return (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                  <td className="border border-gray-400 p-2 text-center font-bold text-gray-900">{itemNumber}</td>
                  <td className="border border-gray-400 p-2 font-black text-gray-900">{item.stockItemName}</td>
                  <td className="border border-gray-400 p-2 font-bold text-gray-800">{stockItem?.composition || '-'}</td>
                  <td className="border border-gray-400 p-2 text-center font-bold text-gray-800">{packing}</td>
                  <td className="border border-gray-400 p-2 text-center font-black text-gray-900">{qtyInStrips.toLocaleString()}</td>
                  <td className="border border-gray-400 p-2 text-center font-black text-gray-900">{qtyInTabs.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Flex spacer */}
        <div className="flex-grow"></div>

        {/* Undertaking & Signature - Only on last page */}
        {isLastPage && (
          <>
            <div className="mt-1">
              <p className="font-black text-base mb-1" style={{ color: '#003366' }}>UNDERTAKING:</p>
              <p className="text-sm font-semibold text-justify text-gray-800" style={{ lineHeight: '1.3' }}>
                We confirm purchase of Buprenorphine products from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), under P.O. No. {poNumber.replace('NH/PO-', '')} dated {formatDate(poDate)} ({getMonthYear(poDate)}). Products will be supplied exclusively to De-Addiction Centres and qualified doctors under License No. PSMHC/Punjab/2024/863. We are aware these are controlled substances per NDPS Act, 1985, and shall maintain all statutory records. Form 6 (Consignment Note) will be issued upon delivery. Products are for formulations/sales within India only, not for retail counter sale or export. Neuroglam shall not be liable for any non-compliance by us.
              </p>
            </div>

            {/* Signature Section */}
            <div className="mt-3 flex justify-between text-base">
              <div className="text-left">
                <p className="font-black text-base" style={{ color: '#003366' }}>For Navjeevan Hospital,</p>
                <p className="text-gray-800 font-bold text-sm">Opp. New Bus Stand, G.T. Road, Sirhind</p>
                <div className="min-h-[80px]"></div>
                <div className="pt-1 border-t-2 border-gray-600 min-w-[220px]">
                  <span className="font-black text-gray-900 text-base">{doctorName}</span>
                  <p className="text-gray-700 text-sm font-bold">Navjeevan Hospital, Sirhind</p>
                  <p className="text-gray-600 text-xs font-semibold italic">(Signature & Stamp)</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-end">
                <div className="min-h-[80px]"></div>
                <div className="pt-1 border-t-2 border-gray-600 min-w-[160px]">
                  <span className="font-black text-gray-900 text-base">Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-3 text-center text-sm font-black py-2 px-4 rounded" style={{ backgroundColor: '#003366' }}>
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
            <span>Neuroglam Purchase Order {totalPages > 1 && `(${totalPages} pages)`}</span>
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
