import { useState, useEffect, useCallback, useRef } from 'react';
import { anprService } from '../services/anpr.service';
import type { AnprResult, AnprQuery } from '../types/anpr';

export function useRecentANPR(query?: AnprQuery, pollIntervalMs: number = 3000) {
  const [results, setResults] = useState<AnprResult[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchResults = useCallback(async () => {
    try {
      const data = await anprService.getRecentAnpr(queryRef.current);
      setResults(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load ANPR observations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchResults, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchResults, pollIntervalMs]);

  return { results, total, loading, error, refresh: fetchResults };
}
