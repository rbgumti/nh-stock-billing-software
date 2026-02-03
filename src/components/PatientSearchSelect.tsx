import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/patientUtils";

interface Patient {
  id: string;
  patient_name: string;
  father_name?: string;
  phone: string;
  file_no: string;
  aadhar_card: string;
  govt_id: string;
  new_govt_id: string;
  address: string;
  age?: string;
  category?: string;
}

interface PatientSearchSelectProps {
  patients: Patient[];
  selectedPatientId?: string;
  onPatientSelect: (patient: Patient) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Maximum results to display for performance
const MAX_DISPLAY_RESULTS = 50;

// Custom debounce hook for smooth input
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
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

  // Debounce search queries for smooth typing (150ms feels instant but batches updates)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 150);
  const debouncedFileNoQuery = useDebouncedValue(fileNoQuery, 100);

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  // Normalize file number for comparison (removes leading zeros)
  const normalizeFileNo = useCallback((fileNo: string | undefined): string => {
    if (!fileNo) return '';
    return fileNo.replace(/^0+/, '') || '0';
  }, []);

  // Pre-index patients for faster file number lookups
  const fileNoIndex = useMemo(() => {
    const index = new Map<string, Patient>();
    patients.forEach(p => {
      if (p?.file_no) {
        index.set(normalizeFileNo(p.file_no), p);
        index.set(p.file_no.toLowerCase().trim(), p);
      }
    });
    return index;
  }, [patients, normalizeFileNo]);

  // Filter patients based on search query - optimized with early returns and limits
  const filteredPatients = useMemo(() => {
    // File number search - use index for exact match, then filter for partial
    if (activeSearch === "fileNo" && debouncedFileNoQuery.trim()) {
      const queryTrimmed = debouncedFileNoQuery.trim();
      const normalizedQuery = normalizeFileNo(queryTrimmed);
      
      // Check for exact match first (instant)
      const exactMatch = fileNoIndex.get(normalizedQuery) || fileNoIndex.get(queryTrimmed.toLowerCase());
      if (exactMatch) return [exactMatch];
      
      // Partial match with limit
      const results: Patient[] = [];
      for (const patient of patients) {
        if (results.length >= MAX_DISPLAY_RESULTS) break;
        if (!patient?.id) continue;
        
        const normalizedFileNo = normalizeFileNo(patient.file_no);
        if (normalizedFileNo.includes(normalizedQuery) || 
            patient.file_no?.toLowerCase().includes(queryTrimmed.toLowerCase())) {
          results.push(patient);
        }
      }
      return results;
    }
    
    // Main search - only search if query has content
    if (!debouncedSearchQuery.trim()) {
      // Return limited recent patients when no search
      return patients.slice(0, MAX_DISPLAY_RESULTS).filter(p => p?.id != null);
    }
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    const results: Patient[] = [];
    
    for (const patient of patients) {
      if (results.length >= MAX_DISPLAY_RESULTS) break;
      if (!patient?.id) continue;
      
      // Check matches in order of likelihood
      if (patient.patient_name?.toLowerCase().includes(query) ||
          patient.id.toString().includes(query) ||
          patient.phone?.toLowerCase().includes(query) ||
          patient.aadhar_card?.toLowerCase().includes(query) ||
          patient.govt_id?.toLowerCase().includes(query)) {
        results.push(patient);
      }
    }
    
    return results;
  }, [patients, debouncedSearchQuery, debouncedFileNoQuery, activeSearch, normalizeFileNo, fileNoIndex]);

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

  // Instant file number lookup for Enter key (bypasses debounce)
  const findExactFileNoMatch = useCallback((query: string) => {
    const normalizedQuery = normalizeFileNo(query.trim());
    return fileNoIndex.get(normalizedQuery) || fileNoIndex.get(query.toLowerCase().trim());
  }, [fileNoIndex, normalizeFileNo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      } else if (e.key === "Enter") {
        e.preventDefault();

        // File No exact match selection (instant, uses index)
        if (activeSearch === "fileNo" && fileNoQuery.trim()) {
          const exactMatch = findExactFileNoMatch(fileNoQuery);
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

        // File No exact match selection (preferred, uses index)
        if (activeSearch === "fileNo" && fileNoQuery.trim()) {
          const exactMatch = findExactFileNoMatch(fileNoQuery);
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

  const handleSelect = useCallback((patient: Patient) => {
    onPatientSelect(patient);
    setSearchQuery("");
    setFileNoQuery("");
    setIsOpen(false);
  }, [onPatientSelect]);

  const handleMainSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setFileNoQuery("");
    setActiveSearch("main");
    setIsOpen(true);
  }, []);

  const handleFileNoSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileNoQuery(e.target.value);
    setSearchQuery("");
    setActiveSearch("fileNo");
    setIsOpen(true);
  }, []);

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
            onChange={handleMainSearchChange}
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
            onChange={handleFileNoSearchChange}
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
        <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">{selectedPatient.patient_name}</span>
            <span className="text-muted-foreground">
              (ID: {selectedPatient.id})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {selectedPatient.file_no && (
              <span><span className="font-medium text-gold">File No:</span> {selectedPatient.file_no}</span>
            )}
            {selectedPatient.phone && (
              <span><span className="font-medium">Phone:</span> {formatPhone(selectedPatient.phone)}</span>
            )}
            {selectedPatient.govt_id && (
              <span><span className="font-medium">Govt ID:</span> {selectedPatient.govt_id}</span>
            )}
            {selectedPatient.new_govt_id && (
              <span><span className="font-medium">New Govt ID:</span> {selectedPatient.new_govt_id}</span>
            )}
            {selectedPatient.aadhar_card && (
              <span><span className="font-medium">Aadhar:</span> {selectedPatient.aadhar_card}</span>
            )}
            {selectedPatient.age && (
              <span><span className="font-medium">Age:</span> {selectedPatient.age}</span>
            )}
          </div>
          {selectedPatient.address && (
            <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span className="font-medium">Address:</span> {selectedPatient.address}
            </div>
          )}
        </div>
      )}

      {/* Dropdown - limited results for performance */}
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
            <>
              {filteredPatients.map((patient, index) => (
                <div
                  key={patient.id}
                  className={cn(
                    "px-4 py-2.5 cursor-pointer transition-colors border-l-2",
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
                      {patient.father_name && (
                        <span className="text-muted-foreground font-normal text-xs mr-2">S/o {patient.father_name}</span>
                      )}
                      {patient.patient_name}
                    </span>
                    <span className="text-muted-foreground text-xs flex flex-wrap gap-x-2">
                      <span>ID: {patient.id}</span>
                      {patient.file_no && <span className="text-gold font-medium">File: {patient.file_no}</span>}
                      {patient.phone && <span>Ph: {formatPhone(patient.phone)}</span>}
                      {patient.aadhar_card && <span>Aadhar: {patient.aadhar_card}</span>}
                    </span>
                  </div>
                </div>
              ))}
              {filteredPatients.length === MAX_DISPLAY_RESULTS && (
                <div className="py-2 px-4 text-xs text-muted-foreground text-center border-t">
                  Showing first {MAX_DISPLAY_RESULTS} results. Type more to narrow search.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}