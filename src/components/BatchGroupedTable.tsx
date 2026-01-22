import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Pencil, BookOpen, Package, Layers } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { formatPrecision } from "@/lib/formatUtils";

interface BatchGroupedTableProps {
  stockItems: StockItem[];
  filteredItems: StockItem[];
  getBatchesForMedicine: (name: string) => StockItem[];
  getCategoryStyle: (category: string) => {
    bg: string;
    text: string;
    border: string;
    badge: string;
    iconBg: string;
    Icon: React.ElementType;
  };
  onEditItem: (item: StockItem) => void;
  onViewLedger: (item: StockItem) => void;
}

export function BatchGroupedTable({
  stockItems,
  filteredItems,
  getBatchesForMedicine,
  getCategoryStyle,
  onEditItem,
  onViewLedger,
}: BatchGroupedTableProps) {
  const [expandedMedicines, setExpandedMedicines] = useState<Set<string>>(new Set());

  // Get unique medicine names from filtered items
  const getUniqueMedicineNames = () => {
    const seen = new Set<string>();
    const unique: string[] = [];
    
    filteredItems.forEach(item => {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item.name);
      }
    });
    
    return unique.sort((a, b) => a.localeCompare(b));
  };

  const toggleExpand = (medicineName: string) => {
    const newExpanded = new Set(expandedMedicines);
    if (newExpanded.has(medicineName.toLowerCase())) {
      newExpanded.delete(medicineName.toLowerCase());
    } else {
      newExpanded.add(medicineName.toLowerCase());
    }
    setExpandedMedicines(newExpanded);
  };

  const uniqueMedicines = getUniqueMedicineNames();

  // Format date for display
  const formatExpiry = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  // Check if expiring soon (within 90 days)
  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays > 0;
  };

  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    return expiry < new Date();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold w-8"></th>
            <th className="px-4 py-3 text-left font-semibold">Item Name</th>
            <th className="px-4 py-3 text-left font-semibold">Vendor</th>
            <th className="px-4 py-3 text-left font-semibold">Category</th>
            <th className="px-4 py-3 text-center font-semibold">Batches</th>
            <th className="px-4 py-3 text-right font-semibold">Total Stock</th>
            <th className="px-4 py-3 text-right font-semibold">Cost/Tab (₹)</th>
            <th className="px-4 py-3 text-right font-semibold">MRP/Tab (₹)</th>
            <th className="px-4 py-3 text-left font-semibold">Packing</th>
            <th className="px-4 py-3 text-center font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {uniqueMedicines.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                No items found. Add your first item using the "Add Item Master" button.
              </td>
            </tr>
          ) : (
            uniqueMedicines.map((medicineName, idx) => {
              const batches = getBatchesForMedicine(medicineName);
              const primaryItem = batches[0];
              const style = getCategoryStyle(primaryItem.category);
              const IconComponent = style.Icon;
              const isExpanded = expandedMedicines.has(medicineName.toLowerCase());
              const totalStock = batches.reduce((sum, b) => sum + b.currentStock, 0);
              const hasMutipleBatches = batches.length > 1;

              return (
                <>
                  {/* Main medicine row */}
                  <tr 
                    key={`main-${primaryItem.id}`} 
                    className={`${idx % 2 === 0 ? 'bg-muted/20' : ''} ${hasMutipleBatches ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                    onClick={() => hasMutipleBatches && toggleExpand(medicineName)}
                  >
                    <td className="px-4 py-3 text-center">
                      {hasMutipleBatches ? (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {primaryItem.name}
                        {hasMutipleBatches && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {batches.length} batches
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{primaryItem.supplier || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${style.badge} flex items-center gap-1 w-fit`}>
                        <IconComponent className="h-3 w-3" />
                        {primaryItem.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasMutipleBatches ? (
                        <span className="text-muted-foreground">{batches.length}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{primaryItem.batchNo || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={totalStock <= primaryItem.minimumStock ? 'text-destructive' : ''}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">₹{formatPrecision(primaryItem.unitPrice)}</td>
                    <td className="px-4 py-3 text-right">{primaryItem.mrp ? `₹${formatPrecision(primaryItem.mrp)}` : '-'}</td>
                    <td className="px-4 py-3">{primaryItem.packing || '-'}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditItem(primaryItem)}
                          className="h-8 w-8 p-0 hover:bg-purple/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewLedger(primaryItem)}
                          className="h-8 w-8 p-0 hover:bg-cyan/10"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded batch rows */}
                  {isExpanded && batches.map((batch, batchIdx) => (
                    <tr 
                      key={`batch-${batch.id}`} 
                      className="bg-muted/10 border-l-4 border-l-purple/30"
                    >
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 pl-8">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span className="text-xs">Batch: <span className="font-medium text-foreground">{batch.batchNo || 'N/A'}</span></span>
                        </div>
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2">
                        <span className={`text-xs ${
                          isExpired(batch.expiryDate) 
                            ? 'text-destructive font-medium' 
                            : isExpiringSoon(batch.expiryDate) 
                              ? 'text-orange-500 font-medium' 
                              : 'text-muted-foreground'
                        }`}>
                          Exp: {formatExpiry(batch.expiryDate)}
                          {isExpired(batch.expiryDate) && ' (Expired)'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-xs text-muted-foreground">{batch.batchNo}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-medium ${batch.currentStock <= batch.minimumStock ? 'text-destructive' : ''}`}>
                          {batch.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">₹{formatPrecision(batch.unitPrice)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{batch.mrp ? `₹${formatPrecision(batch.mrp)}` : '-'}</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditItem(batch)}
                            className="h-6 w-6 p-0 hover:bg-purple/10"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewLedger(batch)}
                            className="h-6 w-6 p-0 hover:bg-cyan/10"
                          >
                            <BookOpen className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
