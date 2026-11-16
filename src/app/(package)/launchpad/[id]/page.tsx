"use client";

import { useParams } from 'next/navigation';
import { useEffect } from 'react';

function CollectionDetailPage() {
  const params = useParams();

  useEffect(() => {
    window.location.href = "/l/"+ params.id;
  }, []);

  return null;
}

export default CollectionDetailPage;