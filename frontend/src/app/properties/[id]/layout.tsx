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
    const res = await axios.get(`http://localhost:5000/api/v1/properties/${id}`);
    const property = res.data.property;

    const parsedImages = property.images ? JSON.parse(property.images) : [];
    const mainImage = parsedImages.length > 0 
      ? `http://localhost:5000${parsedImages[0]}` 
      : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

    return {
      title: `${property.title} | AkwaabaHomes`,
      description: `${property.type} at ${property.location} - ₵${property.price}/year. ${property.description.substring(0, 100)}...`,
      openGraph: {
        title: property.title,
        description: property.description.substring(0, 150),
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
