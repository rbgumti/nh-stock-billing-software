import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CachedPatient {
  id: string;
  patient_name: string;
  phone: string;
  file_no: string;
  aadhar_card: string;
  govt_id: string;
  new_govt_id: string;
  address: string;
  age?: string;
  father_name?: string;
  category?: string;
}

// Global cache - persists across component mounts
let globalPatientCache: CachedPatient[] = [];
let cacheTimestamp: number = 0;
let isLoading = false;
let loadPromise: Promise<CachedPatient[]> | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchAllPatients(): Promise<CachedPatient[]> {
  // Use a single large query with no row limit by requesting count
  // Supabase default limit is 1000, so we set a high range
  const { data, error, count } = await supabase
    .from('patients')
    .select('id, patient_name, phone, file_no, aadhar_card, govt_id, new_govt_id, address, age, father_name, category', { count: 'exact' })
    .order('patient_name', { ascending: true })
    .range(0, 9999);

  if (error) {
    console.error('Error loading patients:', error);
    throw error;
  }

  if (!data) return [];

  const mapped: CachedPatient[] = data.map(p => ({
    id: String(p.id),
    patient_name: p.patient_name || '',
    phone: p.phone || '',
    file_no: p.file_no || '',
    aadhar_card: p.aadhar_card || '',
    govt_id: p.govt_id || '',
    new_govt_id: p.new_govt_id || '',
    address: p.address || '',
    age: p.age || undefined,
    father_name: p.father_name || undefined,
    category: p.category || undefined,
  }));

  // If there are more records beyond 10000, fetch remaining
  if (count && count > 10000) {
    const { data: moreData } = await supabase
      .from('patients')
      .select('id, patient_name, phone, file_no, aadhar_card, govt_id, new_govt_id, address, age, father_name, category')
      .order('patient_name', { ascending: true })
      .range(10000, count - 1);
    
    if (moreData) {
      moreData.forEach(p => mapped.push({
        id: String(p.id),
        patient_name: p.patient_name || '',
        phone: p.phone || '',
        file_no: p.file_no || '',
        aadhar_card: p.aadhar_card || '',
        govt_id: p.govt_id || '',
        new_govt_id: p.new_govt_id || '',
        address: p.address || '',
        age: p.age || undefined,
        father_name: p.father_name || undefined,
        category: p.category || undefined,
      }));
    }
  }

  return mapped;
}

export function usePatientCache() {
  const [patients, setPatients] = useState<CachedPatient[]>(globalPatientCache);
  const [loading, setLoading] = useState(globalPatientCache.length === 0);

  const loadPatients = useCallback(async (force = false) => {
    const now = Date.now();
    const cacheValid = globalPatientCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION;

    // Return cached data if valid and not forcing refresh
    if (cacheValid && !force) {
      setPatients(globalPatientCache);
      setLoading(false);
      return globalPatientCache;
    }

    // If already loading, wait for existing promise
    if (isLoading && loadPromise) {
      const data = await loadPromise;
      setPatients(data);
      setLoading(false);
      return data;
    }

    // Start new load
    isLoading = true;
    setLoading(true);

    loadPromise = fetchAllPatients();

    try {
      const data = await loadPromise;
      globalPatientCache = data;
      cacheTimestamp = Date.now();
      setPatients(data);
      return data;
    } catch (error) {
      console.error('Failed to load patients:', error);
      throw error;
    } finally {
      isLoading = false;
      loadPromise = null;
      setLoading(false);
    }
  }, []);

  // Load on mount - immediate load, no deferral
  useEffect(() => {
    // If we have cached data, use it immediately
    if (globalPatientCache.length > 0) {
      setPatients(globalPatientCache);
      setLoading(false);
      
      // Refresh in background if cache is stale
      const now = Date.now();
      if ((now - cacheTimestamp) >= CACHE_DURATION) {
        loadPatients(true);
      }
      return;
    }

    // No cache - load immediately (not deferred for faster UX)
    loadPatients();
  }, [loadPatients]);

  const refreshPatients = useCallback(() => loadPatients(true), [loadPatients]);

  // Invalidate cache (call after adding/editing patients)
  const invalidateCache = useCallback(() => {
    globalPatientCache = [];
    cacheTimestamp = 0;
  }, []);

  return {
    patients,
    loading,
    refreshPatients,
    invalidateCache
  };
}

// Preload function - call on app init or when navigating to invoice pages
export function preloadPatients() {
  if (globalPatientCache.length === 0 && !isLoading) {
    isLoading = true;
    loadPromise = fetchAllPatients().then(data => {
      globalPatientCache = data;
      cacheTimestamp = Date.now();
      isLoading = false;
      loadPromise = null;
      return data;
    }).catch(err => {
      isLoading = false;
      loadPromise = null;
      throw err;
    });
  }
}
