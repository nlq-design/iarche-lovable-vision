import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPage?: number;
}

interface UsePaginationReturn<T> {
  currentItems: T[];
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

export function usePagination<T>({
  items,
  itemsPerPage = 9,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);

  // Calculate total pages
  const totalPages = Math.ceil(items.length / itemsPerPage);

  // Update URL when page changes
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam !== currentPage.toString()) {
      const newParams = new URLSearchParams(searchParams);
      if (currentPage === 1) {
        newParams.delete('page');
      } else {
        newParams.set('page', currentPage.toString());
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [currentPage, searchParams, setSearchParams]);

  // Sync state with URL changes
  useEffect(() => {
    const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [searchParams]);

  // Reset to page 1 when items change (e.g., after filtering)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [items.length, totalPages]);

  // Calculate current items to display
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  };

  return {
    currentItems,
    currentPage,
    totalPages,
    setPage,
    nextPage,
    previousPage,
  };
}
