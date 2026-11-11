import PropertiesDiscoveryClient, {
  type InitialPropertyFilters,
} from '@/components/properties/PropertiesDiscoveryClient';

function firstParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] || '' : val || '';
}

export default async function PropertiesSearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) || {};
  const initialFilters: InitialPropertyFilters = {
    search: firstParam(resolved.search),
    location: firstParam(resolved.location),
    type: firstParam(resolved.type),
    minPrice: firstParam(resolved.minPrice),
    maxPrice: firstParam(resolved.maxPrice),
    capacity: firstParam(resolved.capacity),
    amenities: firstParam(resolved.amenities).split(',').filter(Boolean),
    targetAudience: firstParam(resolved.targetAudience),
    verified: firstParam(resolved.verified),
    sort: firstParam(resolved.sort) || 'newest',
    page: Number(firstParam(resolved.page) || 1) || 1,
  };

  let initialData: any = undefined;
  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
    const qs = new URLSearchParams();
    qs.set('page', String(initialFilters.page || 1));
    qs.set('limit', '12');
    qs.set('sort', initialFilters.sort || 'newest');
    if (initialFilters.search?.trim()) qs.set('search', initialFilters.search.trim());
    if (initialFilters.location?.trim()) qs.set('location', initialFilters.location.trim());
    if (initialFilters.type) qs.set('type', initialFilters.type);
    if (initialFilters.minPrice) qs.set('minPrice', initialFilters.minPrice);
    if (initialFilters.maxPrice) qs.set('maxPrice', initialFilters.maxPrice);
    if (initialFilters.capacity) qs.set('capacity', initialFilters.capacity);
    if (initialFilters.amenities && initialFilters.amenities.length > 0) {
      qs.set('amenities', initialFilters.amenities.join(','));
    }
    if (initialFilters.targetAudience) qs.set('targetAudience', initialFilters.targetAudience);
    if (initialFilters.verified) qs.set('verified', initialFilters.verified);

    const res = await fetch(`${apiBase}/properties?${qs.toString()}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(1200),
    });
    if (res.ok) {
      const raw = await res.json();
      const firstStrList = (val: unknown, limit: number): string[] => {
        if (Array.isArray(val)) return val.slice(0, limit).filter((v): v is string => typeof v === 'string');
        if (typeof val === 'string' && val.startsWith('[')) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.slice(0, limit).filter((v): v is string => typeof v === 'string');
          } catch {}
        }
        return [];
      };
      if (Array.isArray(raw?.data)) {
        initialData = {
          meta: raw.meta,
          data: raw.data.map((p: any) => ({
            id: p.id,
            title: p.title,
            location: p.location,
            type: p.type,
            price: p.price,
            billingCycle: p.billingCycle,
            pricePeriod: p.pricePeriod,
            capacity: p.capacity,
            isAvailable: p.isAvailable,
            avgRating: p.avgRating,
            reviewCount: p.reviewCount,
            images: firstStrList(p.images, 1),
            amenities: firstStrList(p.amenities, 3),
            landlord: p.landlord ? { isVerifiedLandlord: Boolean(p.landlord.isVerifiedLandlord) } : undefined,
            rooms: Array.isArray(p.rooms)
              ? p.rooms.map((r: any) => ({ isAvailable: r.isAvailable, price: r.price }))
              : undefined,
          })),
        };
      } else {
        initialData = raw;
      }
    }
  } catch {
    // Fall back to client-side React Query fetch if backend SSR fetch times out
  }

  return (
    <>
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <PropertiesDiscoveryClient initialFilters={initialFilters} initialData={initialData} />
    </>
  );
}
