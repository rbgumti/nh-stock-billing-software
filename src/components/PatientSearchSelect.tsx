import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Patient {
  id: number;
  patient_name: string;
  phone: string;
  file_no: string;
  aadhar_card: string;
  govt_id: string;
  age?: string;
}

interface PatientSearchSelectProps {
  patients: Patient[];
  selectedPatientId?: number;
  onPatientSelect: (patient: Patient) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PatientSearchSelect({
  patients,
  selectedPatientId,
  onPatientSelect,
  label = "Patient *",
  placeholder = "Search by Name, Phone, Aadhar, or Govt ID...",
  disabled = false,
}: PatientSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileNoQuery, setFileNoQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [activeSearch, setActiveSearch] = useState<"main" | "fileNo">("main");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileNoInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    // If file number search is active and has a query
    if (activeSearch === "fileNo" && fileNoQuery.trim()) {
      const query = fileNoQuery.toLowerCase().trim();
      return patients.filter((patient) => {
        if (!patient || patient.id == null) return false;
        return patient.file_no?.toLowerCase().trim().includes(query);
      });
    }
    
    // Main search
    if (!searchQuery.trim()) return patients.filter(p => p && p.id != null);
    
    const query = searchQuery.toLowerCase().trim();
    return patients.filter((patient) => {
      if (!patient || patient.id == null) return false;
      const idMatch = patient.id.toString().includes(query);
      const nameMatch = patient.patient_name?.toLowerCase().includes(query);
      const phoneMatch = patient.phone?.toLowerCase().includes(query);
      const aadharMatch = patient.aadhar_card?.toLowerCase().includes(query);
      const govtIdMatch = patient.govt_id?.toLowerCase().includes(query);
      
      return idMatch || nameMatch || phoneMatch || aadharMatch || govtIdMatch;
    });
  }, [patients, searchQuery, fileNoQuery, activeSearch]);

  // Auto-select only when exactly 1 match is found (unique match)
  useEffect(() => {
    if (activeSearch === "fileNo" && fileNoQuery.trim().length >= 1 && filteredPatients.length === 1) {
      const patient = filteredPatients[0];
      onPatientSelect(patient);
      // Clear after a tiny delay to avoid interrupting typing
      setTimeout(() => {
        setFileNoQuery("");
        setIsOpen(false);
      }, 50);
    }
  }, [filteredPatients, activeSearch, fileNoQuery, onPatientSelect]);

  // Reset highlighted index when filtered patients change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredPatients.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      } else if (e.key === "Enter") {
        e.preventDefault();

        // File No exact match selection (doesn't rely on dropdown ordering)
        if (activeSearch === "fileNo" && fileNoQuery.trim()) {
          const query = fileNoQuery.toLowerCase().trim();
          const exactMatch = patients.find(
            (p) => p.file_no?.toLowerCase().trim() === query
          );
          if (exactMatch) {
            handleSelect(exactMatch);
            return;
          }
        }

        // If there are filtered results, select the first one directly
        if (filteredPatients.length > 0) {
          handleSelect(filteredPatients[0]);
        } else {
          setIsOpen(true);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredPatients.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case "Enter": {
        e.preventDefault();

        // File No exact match selection (preferred)
        if (activeSearch === "fileNo" && fileNoQuery.trim()) {
          const query = fileNoQuery.toLowerCase().trim();
          const exactMatch = patients.find(
            (p) => p.file_no?.toLowerCase().trim() === query
          );
          if (exactMatch) {
            handleSelect(exactMatch);
            break;
          }
        }

        if (filteredPatients[highlightedIndex]) {
          handleSelect(filteredPatients[highlightedIndex]);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (patient: Patient) => {
    onPatientSelect(patient);
    setSearchQuery("");
    setFileNoQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {label && <Label>{label}</Label>}
      
      {/* Search Inputs */}
      <div className="grid grid-cols-3 gap-2">
        {/* Main Search */}
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFileNoQuery("");
              setActiveSearch("main");
              setIsOpen(true);
            }}
            onFocus={() => {
              setActiveSearch("main");
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9"
            disabled={disabled}
          />
          <ChevronDown 
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform",
              isOpen && activeSearch === "main" && "rotate-180"
            )}
          />
        </div>
        
        {/* File No Quick Search */}
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold pointer-events-none" />
          <Input
            ref={fileNoInputRef}
            placeholder="File No..."
            value={fileNoQuery}
            onChange={(e) => {
              setFileNoQuery(e.target.value);
              setSearchQuery("");
              setActiveSearch("fileNo");
              setIsOpen(true);
            }}
            onFocus={() => {
              setActiveSearch("fileNo");
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="pl-9 border-gold/30 focus-visible:ring-gold/50"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Selected Patient Display */}
      {selectedPatient && !isOpen && (
        <div className="p-2 bg-muted/50 rounded-md text-sm">
          <span className="font-medium">{selectedPatient.patient_name}</span>
          <span className="text-muted-foreground ml-2">
            ID: {selectedPatient.id}
            {selectedPatient.file_no && ` | File: ${selectedPatient.file_no}`}
            {selectedPatient.phone && ` | Ph: ${selectedPatient.phone}`}
          </span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={listRef}
          className="absolute z-50 w-full max-h-60 overflow-auto bg-popover/95 backdrop-blur-xl border rounded-xl shadow-glass mt-1"
          style={{ width: containerRef.current?.offsetWidth }}
        >
          {filteredPatients.length === 0 ? (
            <div className="py-3 px-4 text-sm text-muted-foreground text-center">
              No patients found
            </div>
          ) : (
            filteredPatients.map((patient, index) => (
              <div
                key={patient.id}
                className={cn(
                  "px-4 py-2.5 cursor-pointer transition-all duration-150 border-l-2",
                  index === highlightedIndex 
                    ? "bg-gold/15 text-foreground border-l-gold font-medium" 
                    : "hover:bg-muted/50 border-l-transparent"
                )}
                onClick={() => handleSelect(patient)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex flex-col">
                  <span className={cn(
                    "font-medium",
                    index === highlightedIndex && "text-navy dark:text-gold"
                  )}>
                    {patient.patient_name}
                  </span>
                  <span className="text-muted-foreground text-xs flex flex-wrap gap-x-2">
                    <span>ID: {patient.id}</span>
                    {patient.file_no && <span className="text-gold font-medium">File: {patient.file_no}</span>}
                    {patient.phone && <span>Ph: {patient.phone}</span>}
                    {patient.aadhar_card && <span>Aadhar: {patient.aadhar_card}</span>}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
