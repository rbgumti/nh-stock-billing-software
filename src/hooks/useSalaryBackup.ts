import { useEffect, useCallback } from 'react';
import { useSalaryStore } from './useSalaryStore';
import { toast } from 'sonner';

const DB_NAME = 'SalaryBackupDB';
const DB_VERSION = 1;
const STORE_NAME = 'backups';
const BACKUP_KEY = 'daily_backup';
const LAST_BACKUP_KEY = 'salary_last_backup_date';

interface BackupData {
  id: string;
  timestamp: string;
  employees: any[];
  salaryRecords: any[];
  attendanceRecords: any[];
}

// Open IndexedDB connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Save backup to IndexedDB
const saveBackup = async (data: BackupData): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      resolve();
    };
    
    transaction.oncomplete = () => db.close();
  });
};

// Get backup from IndexedDB
const getBackup = async (): Promise<BackupData | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(BACKUP_KEY);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
      
      transaction.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
};

// Check if backup is needed (once per day)
const isBackupNeeded = (): boolean => {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
  if (!lastBackup) return true;
  
  const lastBackupDate = new Date(lastBackup);
  const today = new Date();
  
  // Check if last backup was on a different day
  return lastBackupDate.toDateString() !== today.toDateString();
};

export function useSalaryBackup() {
  const { employees, salaryRecords, attendanceRecords } = useSalaryStore();
  
  // Perform automatic backup
  const performBackup = useCallback(async (silent = true) => {
    if (employees.length === 0 && salaryRecords.length === 0 && attendanceRecords.length === 0) {
      return; // Don't backup empty data
    }
    
    try {
      const backupData: BackupData = {
        id: BACKUP_KEY,
        timestamp: new Date().toISOString(),
        employees,
        salaryRecords,
        attendanceRecords,
      };
      
      await saveBackup(backupData);
      
      if (!silent) {
        toast.success('Backup saved to browser storage');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      if (!silent) {
        toast.error('Failed to save backup');
      }
    }
  }, [employees, salaryRecords, attendanceRecords]);
  
  // Restore from backup
  const restoreFromBackup = useCallback(async (): Promise<boolean> => {
    try {
      const backup = await getBackup();
      if (!backup) {
        toast.error('No backup found');
        return false;
      }
      
      const store = useSalaryStore.getState();
      
      // Clear existing data and restore
      useSalaryStore.setState({
        employees: backup.employees || [],
        salaryRecords: backup.salaryRecords || [],
        attendanceRecords: backup.attendanceRecords || [],
      });
      
      toast.success(`Restored from backup (${new Date(backup.timestamp).toLocaleString()})`);
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Failed to restore backup');
      return false;
    }
  }, []);
  
  // Get backup info
  const getBackupInfo = useCallback(async () => {
    const backup = await getBackup();
    if (!backup) return null;
    
    return {
      timestamp: backup.timestamp,
      employeeCount: backup.employees?.length || 0,
      salaryRecordCount: backup.salaryRecords?.length || 0,
      attendanceRecordCount: backup.attendanceRecords?.length || 0,
    };
  }, []);
  
  // Auto-backup on mount and when data changes (once per day)
  useEffect(() => {
    if (isBackupNeeded() && (employees.length > 0 || salaryRecords.length > 0)) {
      performBackup(true);
    }
  }, [employees, salaryRecords, attendanceRecords, performBackup]);
  
  return {
    performBackup,
    restoreFromBackup,
    getBackupInfo,
    isBackupNeeded,
  };
}
