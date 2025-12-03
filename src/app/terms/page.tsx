
'use client';

import { useState, useEffect } from 'react';

export default function TermsPage() {
  const [content, setContent] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      const savedContent = localStorage.getItem('termsAndConditions');
      if (savedContent) {
        setContent(savedContent);
      } else {
        setContent('Terms and Conditions have not been set by an admin yet.');
      }
      
      const handleStorageChange = () => {
          const updatedContent = localStorage.getItem('termsAndConditions');
          setContent(updatedContent || 'Terms and Conditions have not been set by an admin yet.');
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
          window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [hasMounted]);

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
        <h1 className="text-4xl font-bold font-headline mb-6">Terms of Use</h1>
        <div className="prose dark:prose-invert max-w-none">
            {hasMounted ? (
                <p className="whitespace-pre-wrap">{content}</p>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    </div>
  );
}
