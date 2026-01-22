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

  // Filter and sort by expiry date (FIFO - earliest expiry first)
  const filteredMedicines = medicines
    .filter((medicine) =>
      medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.batchNo.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // First sort by name
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      // Then by expiry date (earliest first - FIFO)
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
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

  // Check if this batch is the earliest expiry for its medicine name
  const isEarliestExpiry = (medicine: Medicine) => {
    const sameMedicines = medicines.filter(m => 
      m.name.toLowerCase() === medicine.name.toLowerCase() && m.currentStock > 0
    );
    if (sameMedicines.length <= 1) return false;
    const sorted = [...sameMedicines].sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
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
      <PopoverContent className="w-[400px] p-0 bg-background z-50" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No medicine found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {filteredMedicines.map((medicine) => (
                <CommandItem
                  key={medicine.id}
                  value={medicine.id.toString()}
                  onSelect={() => {
                    onValueChange(medicine.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === medicine.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <span>{medicine.name}</span>
                      {isEarliestExpiry(medicine) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 font-medium">
                          FIFO
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Batch: {medicine.batchNo} | Exp: {formatExpiry(medicine.expiryDate)} | Stock: {medicine.currentStock}
                    </span>
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
