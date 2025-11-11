'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, BookText, FileText, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [terms, setTerms] = useState('');
  const [aboutUs, setAboutUs] = useState('');


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = () => {
    if (logoPreview) {
      localStorage.setItem('websiteLogo', logoPreview);
      toast({
        title: 'Logo Updated',
        description: 'Your new website logo has been saved.',
      });
    } else {
       toast({
        variant: 'destructive',
        title: 'No Logo Selected',
        description: 'Please select a logo to upload.',
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
                <CardTitle>Website Logo</CardTitle>
                <CardDescription>Upload a new logo for your website. It will be displayed in the header.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid gap-6">
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
                            <Input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} />
                        </label>
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
