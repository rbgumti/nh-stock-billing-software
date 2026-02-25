import { useState, useRef } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Medicine {
  id: number;
  name: string;
  batchNo: string;
  currentStock: number;
  expiryDate?: string;
}

interface MedicineSearchSelectProps {
  medicines: Medicine[];
  value: number | undefined;
  onValueChange: (value: number) => void;
  triggerRef?: (el: HTMLButtonElement | null) => void;
}

export function MedicineSearchSelect({
  medicines,
  value,
  onValueChange,
  triggerRef,
}: MedicineSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const selectedMedicine = medicines.find((m) => m.id === value);

  // Helper to check if expiry date is valid
  const isValidExpiry = (date?: string): boolean => {
    if (!date || date === 'N/A' || date.trim() === '') return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  // Helper to check if batch starts with "BATCH" (case-insensitive)
  const isBatchPrefixed = (batchNo?: string): boolean => {
    return batchNo ? batchNo.trim().toUpperCase().startsWith('BATCH') : false;
  };

  // Filter out zero-stock items and sort: by name, then BATCH-prefixed items first (FIFO), then by expiry
  const filteredMedicines = medicines
    .filter((medicine) =>
      medicine.currentStock > 0 && (medicine as any).isActive !== false && (
        medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.batchNo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      // First sort by name
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      
      // Within same medicine: items with batch starting with "BATCH" come first (FIFO)
      const aIsBatchPrefixed = isBatchPrefixed(a.batchNo);
      const bIsBatchPrefixed = isBatchPrefixed(b.batchNo);
      if (aIsBatchPrefixed && !bIsBatchPrefixed) return -1; // BATCH-prefixed comes first
      if (!aIsBatchPrefixed && bIsBatchPrefixed) return 1;
      
      // Then by expiry date (earliest valid expiry first - FIFO)
      const aValid = isValidExpiry(a.expiryDate);
      const bValid = isValidExpiry(b.expiryDate);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1; // N/A goes to end
      if (!bValid) return -1; // N/A goes to end
      return new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime();
    });

  // Helper to format expiry date
  const formatExpiry = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    } catch {
      return "-";
    }
  };

  // Check if this batch should be marked as FIFO (batch starting with "BATCH" and earliest expiry)
  const isFIFOItem = (medicine: Medicine) => {
    // Must have batch starting with "BATCH"
    if (!isBatchPrefixed(medicine.batchNo)) return false;
    
    const sameMedicines = medicines.filter(m => 
      m.name.toLowerCase() === medicine.name.toLowerCase() && 
      m.currentStock > 0 &&
      isBatchPrefixed(m.batchNo)
    );
    if (sameMedicines.length === 0) return false;
    
    // Sort by expiry and check if this is the earliest
    const sorted = [...sameMedicines].sort((a, b) => {
      const aValid = isValidExpiry(a.expiryDate);
      const bValid = isValidExpiry(b.expiryDate);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime();
    });
    return sorted[0]?.id === medicine.id;
  };

  const handleRef = (el: HTMLButtonElement | null) => {
    buttonRef.current = el;
    if (triggerRef) {
      triggerRef(el);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={handleRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedMedicine ? (
            <span className="truncate">
              {selectedMedicine.name} - Batch: {selectedMedicine.batchNo}
            </span>
          ) : (
            <span className="text-muted-foreground">Choose medicine</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0 bg-card border border-border shadow-xl z-50" align="start">
        <Command shouldFilter={false} className="bg-card">
          <div className="flex items-center border-b border-border px-3 bg-muted/50">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="bg-card">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No medicine found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto p-1">
              {filteredMedicines.map((medicine) => (
                <CommandItem
                  key={medicine.id}
                  value={medicine.id.toString()}
                  onSelect={() => {
                    onValueChange(medicine.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-primary/10 data-[selected=true]:bg-primary/15 transition-colors"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary",
                      value === medicine.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{medicine.name}</span>
                      {isFIFOItem(medicine) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold">
                          FIFO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Batch: <span className="font-medium text-foreground/80">{medicine.batchNo || '-'}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Exp: <span className="font-medium text-foreground/80">{formatExpiry(medicine.expiryDate)}</span>
                      </span>
                      <span className={cn(
                        "font-semibold",
                        medicine.currentStock <= 10 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        Stock: {medicine.currentStock}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
