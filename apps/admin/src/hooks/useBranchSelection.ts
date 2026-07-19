import { useState, useEffect } from 'react';
import { getBranches, type Branch } from '../api/catalog';

const STORAGE_KEY = 'pandoroom_selected_branch_id';

/**
 * Shared hook for branch selection with localStorage persistence.
 * Remembers the user's choice across all grids, reports, and registry.
 */
export function useBranchSelection() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchIdRaw] = useState<string>('');

  // Wrap setBranchId to persist to localStorage
  const setBranchId = (id: string) => {
    setBranchIdRaw(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  useEffect(() => {
    getBranches()
      .then((data) => {
        setBranches(data);
        // Restore from localStorage, or fall back to first branch
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && data.some((b) => b.id === saved)) {
          setBranchIdRaw(saved);
        } else if (data.length > 0) {
          // Prefer the branch with the lowest sortOrder (or first in array)
          const sorted = [...data].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
          setBranchIdRaw(sorted[0].id);
        }
      })
      .catch(console.error);
  }, []);

  return { branches, branchId, setBranchId };
}
