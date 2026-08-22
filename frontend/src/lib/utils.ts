export const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // Get the base API URL and strip the /api/v1 part to get the root domain
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const rootUrl = apiUrl.replace('/api/v1', '');
  
  return `${rootUrl}${url}`;
};
