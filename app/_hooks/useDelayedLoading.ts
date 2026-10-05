import { useEffect, useRef, useState } from 'react';
import { SHOW_DELAY, MIN_VISIBLE } from '@/app/lib/constants';

const useDelayedLoading = (isFetching: boolean) => {
  const [showLoading, setShowLoading] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const startTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isFetching) {
      startTimeoutIdRef.current = setTimeout(() => {
        startTimeRef.current = Date.now();

        setShowLoading(true);
      }, SHOW_DELAY);
    }

    if (!isFetching && startTimeoutIdRef.current && startTimeRef.current) {
      const elapsedTime = Date.now() - startTimeRef.current;
      if (elapsedTime > MIN_VISIBLE) {
        setShowLoading(false);
      } else {
        endTimeoutIdRef.current = setTimeout(() => {
          setShowLoading(false);
        }, MIN_VISIBLE - elapsedTime);
      }
    }

    return () => {
      if (startTimeoutIdRef.current) clearTimeout(startTimeoutIdRef.current);
      if (endTimeoutIdRef.current) clearTimeout(endTimeoutIdRef.current);
    };
  }, [isFetching]);

  return {
    showLoading,
  };
};

export default useDelayedLoading;
