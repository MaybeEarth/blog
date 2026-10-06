'use client';

import { useEffect, useRef } from 'react';
import { webApi } from '../lib/api';

export interface ViewBeaconProps {
  postId: string;
  locale: string;
}

export const ViewBeacon: React.FC<ViewBeaconProps> = ({ postId, locale }) => {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;

    const timer = setTimeout(() => {
      if (!document.hidden && !sentRef.current) {
        sentRef.current = true;
        webApi.sendViewBeacon(postId, locale);
      }
    }, 3000); // 3 saniye sonra görüntüleme sayılır

    return () => clearTimeout(timer);
  }, [postId, locale]);

  return null;
};
