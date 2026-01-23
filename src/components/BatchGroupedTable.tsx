import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, BookOpen } from "lucide-react";
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

  const uniqueMedicines = getUniqueMedicineNames();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Item Name</th>
            <th className="px-4 py-3 text-left font-semibold">Vendor</th>
            <th className="px-4 py-3 text-left font-semibold">Category</th>
            <th className="px-4 py-3 text-right font-semibold">Stock</th>
            <th className="px-4 py-3 text-right font-semibold">Cost/Tab (₹)</th>
            <th className="px-4 py-3 text-right font-semibold">MRP/Tab (₹)</th>
            <th className="px-4 py-3 text-left font-semibold">Packing</th>
            <th className="px-4 py-3 text-center font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {uniqueMedicines.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                No items found. Add your first item using the "Add Item Master" button.
              </td>
            </tr>
          ) : (
            uniqueMedicines.map((medicineName, idx) => {
              const batches = getBatchesForMedicine(medicineName);
              const primaryItem = batches[0];
              const style = getCategoryStyle(primaryItem.category);
              const IconComponent = style.Icon;
              const totalStock = batches.reduce((sum, b) => sum + b.currentStock, 0);

              return (
                <tr 
                  key={`main-${primaryItem.id}`} 
                  className={`${idx % 2 === 0 ? 'bg-muted/20' : ''}`}
                >
                  <td className="px-4 py-3 font-medium">{primaryItem.name}</td>
                  <td className="px-4 py-3">{primaryItem.supplier || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${style.badge} flex items-center gap-1 w-fit`}>
                      <IconComponent className="h-3 w-3" />
                      {primaryItem.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={totalStock <= primaryItem.minimumStock ? 'text-destructive' : ''}>
                      {totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">₹{formatPrecision(primaryItem.unitPrice)}</td>
                  <td className="px-4 py-3 text-right">{primaryItem.mrp ? `₹${formatPrecision(primaryItem.mrp)}` : '-'}</td>
                  <td className="px-4 py-3">{primaryItem.packing || '-'}</td>
                  <td className="px-4 py-3 text-center">
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
