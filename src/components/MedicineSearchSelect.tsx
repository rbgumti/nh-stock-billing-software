import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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

  const filteredMedicines = medicines.filter((medicine) =>
    medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    medicine.batchNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <div className="flex flex-col">
                    <span>{medicine.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Batch: {medicine.batchNo} | Stock: {medicine.currentStock}
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
