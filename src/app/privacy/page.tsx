
'use client';

import { useState, useEffect } from 'react';

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
        const savedContent = localStorage.getItem('privacyPolicy');
        if (savedContent) {
        setContent(savedContent);
        } else {
            setContent('Privacy Policy content has not been set by an admin yet.')
        }

        const handleStorageChange = () => {
            const updatedContent = localStorage.getItem('privacyPolicy');
            setContent(updatedContent || 'Privacy Policy content has not been set by an admin yet.');
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }
  }, [hasMounted]);

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
        <h1 className="text-4xl font-bold font-headline mb-6">Privacy Policy</h1>
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
