
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, BookText, FileText, Info, Palette, Twitter, Facebook, Instagram, DollarSign, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { SiteSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: keyof SiteSettings) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ variant: 'destructive', title: 'File too large', description: 'Image must be smaller than 2MB.' });
      return;
    }

    setIsUploading(prev => ({ ...prev, [fieldName]: true }));
    const storage = getStorage();
    const storageRef = ref(storage, `site-settings/${uuidv4()}-${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, [fieldName]: downloadURL }));
      toast({ title: 'Image Uploaded', description: 'Your image has been uploaded. Save changes to apply.' });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
      setIsUploading(prev => ({ ...prev, [fieldName]: false }));
    }
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
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="socials">Socials</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="branding">
            <Card>
                <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Manage your website logo and favicon.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid gap-2">
                      <Label htmlFor="logoUrl">Logo Image</Label>
                      <div className="flex items-center justify-center w-full">
                          <label htmlFor="logoUrl-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
                                {isUploading.logoUrl && <Loader2 className="h-8 w-8 animate-spin" />}
                                {!isUploading.logoUrl && formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo preview" className="h-24 w-auto object-contain" />
                                ) : !isUploading.logoUrl && (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG (MAX. 2MB)</p>
                                    </div>
                                )}
                                <Input id="logoUrl-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml, image/webp" onChange={(e) => handleFileChange(e, 'logoUrl')} />
                          </label>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="faviconUrl">Favicon Image</Label>
                       <div className="flex items-center gap-4">
                            <label htmlFor="faviconUrl-upload" className="flex items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
                                {isUploading.faviconUrl && <Loader2 className="h-6 w-6 animate-spin" />}
                                {!isUploading.faviconUrl && formData.faviconUrl ? (
                                    <img src={formData.faviconUrl} alt="Favicon preview" className="h-12 w-12 object-contain" />
                                ) : !isUploading.faviconUrl && (
                                   <div className="flex flex-col items-center justify-center text-center p-2">
                                        <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Upload .ico, .png, .svg</p>
                                    </div>
                                )}
                                <Input id="faviconUrl-upload" type="file" className="hidden" accept="image/x-icon, image/png, image/svg+xml" onChange={(e) => handleFileChange(e, 'faviconUrl')} />
                            </label>
                            <div>
                                <p className="text-sm text-muted-foreground">Upload a new favicon.</p>
                                <p className="text-xs text-muted-foreground">This will appear in the browser tab.</p>
                            </div>
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
                <Label htmlFor="heroBannerUrl">Homepage Banner Image</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="heroBannerUrl-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
                    {isUploading.heroBannerUrl && <Loader2 className="h-8 w-8 animate-spin" />}
                    {!isUploading.heroBannerUrl && formData.heroBannerUrl ? (
                      <img src={formData.heroBannerUrl} alt="Hero banner preview" className="h-full w-full object-cover" />
                    ) : !isUploading.heroBannerUrl && (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 2MB)</p>
                      </div>
                    )}
                    <Input id="heroBannerUrl-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e, 'heroBannerUrl')} />
                  </label>
                </div>
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
        <TabsContent value="pricing">
            <Card>
                <CardHeader>
                    <CardTitle>Vendor Pricing Tiers</CardTitle>
                    <CardDescription>Set the monthly prices for your vendor subscription plans. Changes will be reflected on the vendor landing page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="premium-price" className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Premium Plan Price (NGN)</Label>
                        <Input id="premium-price" placeholder="e.g. 15000" type="number"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="diamond-price" className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Diamond Plan Price (NGN)</Label>
                        <Input id="diamond-price" placeholder="e.g. 50000" type="number"/>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => toast({ title: "Note: This is a UI demo", description: "In a real app, this would save the prices to a secure backend." })}>Save Prices</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
