
'use client';

import Image from 'next/image';
import { useFirebase } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

const DEFAULT_LOGO_URL = '/default-logo.png';

export function SplashScreen() {
    const { siteSettings } = useFirebase();
    const [progress, setProgress] = useState(13)

    useEffect(() => {
        const timer = setTimeout(() => setProgress(80), 500)
        const timer2 = setTimeout(() => setProgress(100), 1500)
        return () => {
            clearTimeout(timer)
            clearTimeout(timer2)
        }
    }, [])

    const logoUrl = siteSettings?.logoUrl || DEFAULT_LOGO_URL;

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#1e40af] text-white">
            <div className="flex flex-col items-center gap-6">
                <Image src={logoUrl} alt="OccasionCraft Logo" width={200} height={50} className="h-12 w-auto" unoptimized />
                <div className="w-48">
                    <Progress value={progress} className="h-2 animated-progress" />
                </div>
            </div>
        </div>
    );
}
