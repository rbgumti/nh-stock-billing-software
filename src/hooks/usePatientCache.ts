import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CachedPatient {
  id: number;
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
  let allPatients: CachedPatient[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('patients')
      .select('id, patient_name, phone, file_no, aadhar_card, govt_id, new_govt_id, address, age, father_name, category')
      .range(from, from + batchSize - 1)
      .order('patient_name', { ascending: true });

    if (error) {
      console.error('Error loading patients:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allPatients = [...allPatients, ...data];
      from += batchSize;
      if (data.length < batchSize) {
        hasMore = false;
      }
    }
  }

  return allPatients;
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
