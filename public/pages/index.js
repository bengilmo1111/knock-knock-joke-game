import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Redirect to the static HTML file
    window.location.href = '/index.html';
  }, []);

  return null;
}