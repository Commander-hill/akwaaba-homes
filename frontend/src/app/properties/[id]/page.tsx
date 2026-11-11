import PropertyDetailsClient from '@/components/properties/PropertyDetailsClient';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

async function getPropertySSR(id: string) {
  try {
    const res = await fetch(`${API_BASE}/properties/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1800),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.property ?? null;
  } catch {
    return null;
  }
}

async function getReviewsSSR(id: string) {
  try {
    const res = await fetch(`${API_BASE}/reviews/property/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1800),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [initialProperty, initialReviews] = await Promise.all([
    getPropertySSR(id),
    getReviewsSSR(id),
  ]);

  return (
    <PropertyDetailsClient
      propertyId={id}
      initialProperty={initialProperty}
      initialReviews={initialReviews}
    />
  );
}
