
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, BookText, FileText, Info, Image as ImageIcon, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { useUser } from '@/firebase';

// Type to hold file data and preview
type FileUploadState = {
  file: File | null;
  preview: string | null;
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();

  const [logo, setLogo] = useState<FileUploadState>({ file: null, preview: null });
  const [favicon, setFavicon] = useState<FileUploadState>({ file: null, preview: null });
  const [heroBanner, setHeroBanner] = useState<FileUploadState>({ file: null, preview: null });

  const [primaryColor, setPrimaryColor] = useState('#74c0fc');
  const [backgroundColor, setBackgroundColor] = useState('#f7faff');
  const [accentColor, setAccentColor] = useState('#8ce99a');

  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [terms, setTerms] = useState('');
  const [aboutUs, setAboutUs] = useState('');

  useEffect(() => {
    const loadSettings = () => {
      const savedLogo = localStorage.getItem('websiteLogo');
      if (savedLogo) setLogo(prev => ({ ...prev, preview: savedLogo }));

      const savedFavicon = localStorage.getItem('websiteFavicon');
      if (savedFavicon) setFavicon(prev => ({ ...prev, preview: savedFavicon }));
      
      const savedHeroBanner = localStorage.getItem('heroBannerImage');
      if (savedHeroBanner) setHeroBanner(prev => ({...prev, preview: savedHeroBanner }));

      const savedPrimary = localStorage.getItem('theme-primary-hex');
      if (savedPrimary) setPrimaryColor(savedPrimary);

      const savedBackground = localStorage.getItem('theme-background-hex');
      if (savedBackground) setBackgroundColor(savedBackground);
      
      const savedAccent = localStorage.getItem('theme-accent-hex');
      if (savedAccent) setAccentColor(savedAccent);
    };
    
    loadSettings();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'hero') => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image smaller than 2MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const fileState = { file, preview: result };
        if (type === 'logo') setLogo(fileState);
        else if (type === 'favicon') setFavicon(fileState);
        else if (type === 'hero') setHeroBanner(fileState);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAsset = async (fileState: FileUploadState): Promise<string | null> => {
    if (!fileState.file || !fileState.preview || !user) return null;
    
    const storage = getStorage();
    // Use the original filename to create a unique path
    const storageRef = ref(storage, `public/assets/${fileState.file.name}`);
    
    await uploadString(storageRef, fileState.preview, 'data_url');
    return getDownloadURL(storageRef);
  };

  const handleSaveBranding = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to save changes.' });
      return;
    }
    
    let changesMade = false;
    try {
      if (logo.file) {
        const logoUrl = await uploadAsset(logo);
        if (logoUrl) {
          localStorage.setItem('websiteLogo', logoUrl);
          changesMade = true;
        }
      }
      if (favicon.file) {
        const faviconUrl = await uploadAsset(favicon);
        if (faviconUrl) {
          localStorage.setItem('websiteFavicon', faviconUrl);
          changesMade = true;
        }
      }

      if (changesMade) {
        toast({
          title: 'Branding Updated',
          description: 'Your new branding has been saved. Refresh to see changes.',
        });
        window.dispatchEvent(new Event('storage'));
      } else {
         toast({
          variant: 'destructive',
          title: 'No New Image Selected',
          description: 'Please select a new logo or favicon to upload.',
        });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    }
  };

  const handleSaveAppearance = async () => {
     if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to save changes.' });
      return;
    }
    // Function to convert hex to HSL string "H S% L%"
    const hexToHslString = (hex: string): string => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        return `${h} ${s}% ${l}%`;
    };

    localStorage.setItem('theme-primary-hex', primaryColor);
    localStorage.setItem('theme-background-hex', backgroundColor);
    localStorage.setItem('theme-accent-hex', accentColor);
    
    localStorage.setItem('theme-primary', hexToHslString(primaryColor));
    localStorage.setItem('theme-background', hexToHslString(backgroundColor));
    localStorage.setItem('theme-accent', hexToHslString(accentColor));
    
    try {
      if (heroBanner.file) {
        const bannerUrl = await uploadAsset(heroBanner);
        if (bannerUrl) {
          localStorage.setItem('heroBannerImage', bannerUrl);
        }
      }
      
      toast({
          title: 'Appearance Saved',
          description: 'Your new theme settings have been saved. The theme will update dynamically.',
      });
      window.dispatchEvent(new Event('storage'));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Banner Upload Failed', description: error.message });
    }
  };
  
  const handleSaveContent = () => {
    localStorage.setItem('privacyPolicy', privacyPolicy);
    localStorage.setItem('termsAndConditions', terms);
    localStorage.setItem('aboutUs', aboutUs);
    toast({
        title: 'Content Saved',
        description: 'Your website content has been updated.',
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
        <p className="text-muted-foreground">Manage your website&apos;s appearance and content.</p>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>
        <TabsContent value="branding">
            <Card>
                <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Manage your website logo and favicon.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid gap-8">
                    <div className="grid gap-2">
                      <Label htmlFor="logo-upload">Logo Image</Label>
                      <div className="flex items-center justify-center w-full">
                          <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
                              {logo.preview ? (
                                  <img src={logo.preview} alt="Logo preview" className="h-full w-full object-contain p-4" />
                              ) : (
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG (MAX. 2MB)</p>
                                  </div>
                              )}
                              <Input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => handleFileChange(e, 'logo')} />
                          </label>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="favicon-upload">Favicon Image</Label>
                       <div className="flex items-center gap-4">
                            <label htmlFor="favicon-upload" className="flex items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
                                {favicon.preview ? (
                                    <img src={favicon.preview} alt="Favicon preview" className="h-full w-full object-contain p-2" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}
                                <Input id="favicon-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml, image/x-icon" onChange={(e) => handleFileChange(e, 'favicon')} />
                            </label>
                            <div>
                                <p className="text-sm text-muted-foreground">Upload a .png, .jpg, .svg, or .ico file.</p>
                                <p className="text-xs text-muted-foreground">Recommended size: 32x32px or 64x64px.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                    <Button onClick={handleSaveBranding}>Save Changes</Button>
                    </div>
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
                    <Label htmlFor="primary-color">Primary</Label>
                    <Input id="primary-color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 p-1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="background-color">Background</Label>
                    <Input id="background-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 p-1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accent-color">Accent</Label>
                    <Input id="accent-color" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 p-1" />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hero-banner-upload">Homepage Banner Image</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="hero-banner-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80 relative">
                    {heroBanner.preview ? (
                      <img src={heroBanner.preview} alt="Hero banner preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 2MB)</p>
                      </div>
                    )}
                    <Input id="hero-banner-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e, 'hero')} />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveAppearance}>Save Appearance</Button>
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
                        <Label htmlFor="privacy-policy" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Privacy Policy</Label>
                        <Textarea id="privacy-policy" placeholder="Enter your privacy policy..." className="min-h-40" value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="terms-conditions" className="flex items-center gap-2"><BookText className="h-4 w-4" /> Terms & Conditions</Label>
                        <Textarea id="terms-conditions" placeholder="Enter your terms and conditions..." className="min-h-40" value={terms} onChange={(e) => setTerms(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="about-us" className="flex items-center gap-2"><Info className="h-4 w-4" /> About Us</Label>
                        <Textarea id="about-us" placeholder="Enter your about us content..." className="min-h-40" value={aboutUs} onChange={(e) => setAboutUs(e.target.value)} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveContent}>Save Content</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    