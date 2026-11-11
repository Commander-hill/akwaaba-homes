export const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    if (url.includes('res.cloudinary.com/') && url.includes('/image/upload/')) {
      const marker = '/image/upload/';
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      if (!after.startsWith('f_') && !after.startsWith('w_') && !after.startsWith('c_') && !after.startsWith('q_')) {
        return `${url.slice(0, idx + marker.length)}f_auto,q_auto:eco,w_420,c_limit/${after}`;
      }
    }
    if (url.includes('images.unsplash.com/')) {
      try {
        const parsed = new URL(url);
        parsed.searchParams.set('auto', 'format');
        parsed.searchParams.set('fit', 'crop');
        parsed.searchParams.set('w', '420');
        parsed.searchParams.set('q', '60');
        parsed.searchParams.delete('fm');
        return parsed.toString();
      } catch {
        return url;
      }
    }
    return url;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const rootUrl = apiUrl.replace(/\/api(\/v1)?\/?$/, '').replace(/\/$/, '');

  const normalizedPath = url.startsWith('/api/upload')
    ? url.replace('/api/upload', '/api/v1/upload')
    : url;

  return `${rootUrl}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
};
