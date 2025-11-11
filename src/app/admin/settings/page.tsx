
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, BookText, FileText, Info, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [terms, setTerms] = useState('');
  const [aboutUs, setAboutUs] = useState('');

  useEffect(() => {
    const savedLogo = localStorage.getItem('websiteLogo');
    if (savedLogo) {
      setLogoPreview(savedLogo);
    }
    const savedFavicon = localStorage.getItem('websiteFavicon');
    if (savedFavicon) {
      setFaviconPreview(savedFavicon);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image smaller than 1MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'logo') {
          setLogoPreview(result);
        } else {
          setFaviconPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = () => {
    let changesMade = false;
    if (logoPreview) {
      localStorage.setItem('websiteLogo', logoPreview);
      changesMade = true;
    }
    if (faviconPreview) {
      localStorage.setItem('websiteFavicon', faviconPreview);
      changesMade = true;
    }

    if (changesMade) {
      toast({
        title: 'Branding Updated',
        description: 'Your new branding has been saved.',
      });
    } else {
       toast({
        variant: 'destructive',
        title: 'No Image Selected',
        description: 'Please select a logo or favicon to upload.',
      });
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="branding">Branding</TabsTrigger>
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
                              {logoPreview ? (
                                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-4" />
                              ) : (
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG (MAX. 1MB)</p>
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
                                {faviconPreview ? (
                                    <img src={faviconPreview} alt="Favicon preview" className="h-full w-full object-contain p-2" />
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
