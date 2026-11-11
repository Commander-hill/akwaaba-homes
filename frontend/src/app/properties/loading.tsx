
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

export default function PublicPropertiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CardGridSkeleton />
    </div>
  );
}
