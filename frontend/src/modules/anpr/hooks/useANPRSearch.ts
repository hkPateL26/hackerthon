import { useState, useEffect, useCallback } from 'react';
import { anprService } from '../services/anpr.service';
import type { AnprResult } from '../types/anpr';

export function useANPRSearch(initialTerm: string = '', debounceMs: number = 300) {
  const [searchTerm, setSearchTerm] = useState<string>(initialTerm);
  const [searchResults, setSearchResults] = useState<AnprResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const executeSearch = useCallback(async (term: string) => {
    if (!term || term.trim().length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const data = await anprService.searchPlates(term);
      setSearchResults(data);
    } catch (err: any) {
      setSearchError(err?.response?.data?.message || err?.message || 'Plate search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs, executeSearch]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    searchError,
    executeSearch,
  };
}
