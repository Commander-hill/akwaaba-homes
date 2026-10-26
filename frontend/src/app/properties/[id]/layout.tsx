import { Metadata, ResolvingMetadata } from 'next';
import axios from 'axios';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const unwrappedParams = await params;
  const id = unwrappedParams.id;

  try {
    const apiBase = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
    const res = await axios.get(`${apiBase}/properties/${id}`);
    const property = res.data?.property;

    if (!property) {
      return {
        title: 'Property Not Found | AkwaabaHomes',
        description: 'The property you are looking for does not exist.',
      };
    }

    let parsedImages: string[] = [];
    if (Array.isArray(property.images)) {
      parsedImages = property.images;
    } else if (typeof property.images === 'string') {
      try {
        parsedImages = JSON.parse(property.images);
      } catch {
        parsedImages = [property.images];
      }
    }

    const defaultImg = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
    let mainImage = defaultImg;
    if (parsedImages.length > 0 && parsedImages[0]) {
      const first = parsedImages[0];
      if (first.startsWith('http://') || first.startsWith('https://')) {
        mainImage = first;
      } else {
        const rootBase = apiBase.replace(/\/api(\/v1)?\/?$/, '');
        mainImage = `${rootBase}${first.startsWith('/') ? '' : '/'}${first}`;
      }
    }

    return {
      title: `${property.title} | AkwaabaHomes`,
      description: `${property.type || 'Property'} in ${property.location || 'Ghana'} - GH₵${property.price || 0}/yr. ${property.description ? property.description.substring(0, 100) : ''}...`,
      openGraph: {
        title: property.title,
        description: property.description ? property.description.substring(0, 150) : '',
        images: [mainImage],
      },
    };
  } catch (error) {
    return {
      title: 'Property Not Found | AkwaabaHomes',
      description: 'The property you are looking for does not exist.',
    };
  }
}

export default function PropertyLayout({ children }: Props) {
  return <>{children}</>;
}
