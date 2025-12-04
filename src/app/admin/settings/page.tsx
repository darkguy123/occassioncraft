
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BookText, FileText, Info, Palette, Twitter, Facebook, Instagram } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SiteSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'site');
  }, [firestore]);

  const { data: siteSettings, isLoading: isSettingsLoading } = useDoc<SiteSettings>(settingsDocRef);
  
  const [formData, setFormData] = useState<Partial<SiteSettings>>({});
  
  useEffect(() => {
    if (siteSettings) {
      setFormData(siteSettings);
    }
  }, [siteSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (section: string) => {
    if (!settingsDocRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database not available.' });
      return;
    }
    setDocumentNonBlocking(settingsDocRef, formData, { merge: true });
    toast({
      title: `${section} Saved`,
      description: `Your ${section.toLowerCase()} settings have been saved.`,
    });
  };
  
  if (isSettingsLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-6 w-1/3" />
            <Card>
                <CardHeader><Skeleton className="h-10 w-32" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
        <p className="text-muted-foreground">Manage your website's appearance and content.</p>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="socials">Socials</TabsTrigger>
        </TabsList>
        <TabsContent value="branding">
            <Card>
                <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Manage your website logo and favicon by providing public paths to your images (e.g., /logo.png). Upload your files to the `public` directory.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid gap-2">
                      <Label htmlFor="logoUrl">Logo Path</Label>
                      <Input id="logoUrl" placeholder="/logo.png" value={formData.logoUrl || ''} onChange={handleInputChange} />
                       <div className="flex items-center gap-4 mt-2">
                         <p className="text-sm text-muted-foreground">Current Logo:</p>
                         <Image src={formData.logoUrl || '/default-logo.png'} alt="Logo preview" width={140} height={32} className="h-8 w-auto bg-neutral-200 p-1 rounded" unoptimized/>
                       </div>
                    </div>

                    <div className="grid gap-2">
                       <Label htmlFor="faviconUrl">Favicon Path</Label>
                       <Input id="faviconUrl" placeholder="/download.png" value={formData.faviconUrl || ''} onChange={handleInputChange} />
                       <div className="flex items-center gap-4 mt-2">
                         <p className="text-sm text-muted-foreground">Current Favicon:</p>
                         <Image src={formData.faviconUrl || '/download.png'} alt="Favicon preview" width={32} height={32} className="h-8 w-8 bg-neutral-200 p-1 rounded" unoptimized/>
                       </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={() => handleSave('Branding')}>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize your website's colors and homepage banner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="flex items-center gap-2 mb-2"><Palette className="h-4 w-4" /> Theme Colors</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="primaryColor">Primary</Label>
                    <Input id="primaryColor" type="color" value={formData.primaryColor || '#000000'} onChange={handleInputChange} className="h-10 p-1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="backgroundColor">Background</Label>
                    <Input id="backgroundColor" type="color" value={formData.backgroundColor || '#ffffff'} onChange={handleInputChange} className="h-10 p-1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accentColor">Accent</Label>
                    <Input id="accentColor" type="color" value={formData.accentColor || '#f0f0f0'} onChange={handleInputChange} className="h-10 p-1" />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="heroBannerUrl">Homepage Banner URL</Label>
                <Input id="heroBannerUrl" placeholder="https://example.com/banner.jpg" value={formData.heroBannerUrl || ''} onChange={handleInputChange} />
              </div>

              <div className="flex justify-end">
                 <Button onClick={() => handleSave('Appearance')}>Save Appearance</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="content">
            <Card>
                 <CardHeader>
                    <CardTitle>Website Content</CardTitle>
                    <CardDescription>Manage pages like Privacy Policy, Terms & Conditions, and About Us.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="privacyPolicy" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Privacy Policy</Label>
                        <Textarea id="privacyPolicy" placeholder="Enter your privacy policy..." className="min-h-40" value={formData.privacyPolicy || ''} onChange={handleInputChange} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="termsAndConditions" className="flex items-center gap-2"><BookText className="h-4 w-4" /> Terms & Conditions</Label>
                        <Textarea id="termsAndConditions" placeholder="Enter your terms and conditions..." className="min-h-40" value={formData.termsAndConditions || ''} onChange={handleInputChange} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="aboutUs" className="flex items-center gap-2"><Info className="h-4 w-4" /> About Us</Label>
                        <Textarea id="aboutUs" placeholder="Enter your about us content..." className="min-h-40" value={formData.aboutUs || ''} onChange={handleInputChange} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => handleSave('Content')}>Save Content</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="socials">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Add the URLs for your social media profiles to be displayed in the footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="twitterUrl" className="flex items-center gap-2"><Twitter className="h-4 w-4 text-[#1DA1F2]" /> Twitter</Label>
                <Input
                  id="twitterUrl"
                  placeholder="https://twitter.com/your-profile"
                  value={formData.twitterUrl || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookUrl" className="flex items-center gap-2"><Facebook className="h-4 w-4 text-[#1877F2]" /> Facebook</Label>
                <Input
                  id="facebookUrl"
                  placeholder="https://facebook.com/your-profile"
                  value={formData.facebookUrl || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagramUrl" className="flex items-center gap-2"><Instagram className="h-4 w-4 text-[#E4405F]" /> Instagram</Label>
                <Input
                  id="instagramUrl"
                  placeholder="https://instagram.com/your-profile"
                  value={formData.instagramUrl || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSave('Socials')}>Save Socials</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
