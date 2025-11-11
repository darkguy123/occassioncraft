'use client';

import { useState, useEffect } from 'react';

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    // This runs on the client and retrieves the content from localStorage
    const savedContent = localStorage.getItem('privacyPolicy');
    if (savedContent) {
      setContent(savedContent);
    } else {
        setContent('Privacy Policy content has not been set by an admin yet.')
    }
  }, []);

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
        <h1 className="text-4xl font-bold font-headline mb-6">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-none">
            {content ? (
                <p className="whitespace-pre-wrap">{content}</p>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    </div>
  );
}
