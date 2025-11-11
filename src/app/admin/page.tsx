'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

const sampleVendors = [
  { id: 'v1', name: 'MusicMakers Inc.', email: 'contact@musicmakers.com', status: 'Approved', events: 5 },
  { id: 'v2', name: 'ArtVisionaries', email: 'hello@artvisionaries.co', status: 'Pending', events: 1 },
  { id: 'v3', name: 'TechForward', email: 'events@techforward.io', status: 'Approved', events: 12 },
];

const sampleEvents = [
  { id: 'e1', name: 'Global Music Fest 2024', vendor: 'MusicMakers Inc.', status: 'Published', tickets: 1204 },
  { id: 'e2', name: 'Innovate & Create Tech Summit', vendor: 'TechForward', status: 'Published', tickets: 850 },
  { id: 'e3', name: 'Art in the Park', vendor: 'ArtVisionaries', status: 'Draft', tickets: 0 },
];

const sampleUsers = [
    { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', role: 'User', joined: '2023-01-15' },
    { id: 'u2', name: 'Bob Williams', email: 'bob@example.com', role: 'Vendor', joined: '2023-02-20' },
    { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', joined: '2023-03-10' },
];


export default function AdminDashboardPage() {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const savedLogo = localStorage.getItem('websiteLogo');
        if (savedLogo) {
            setLogoPreview(savedLogo);
        }
    }, []);

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveLogo = () => {
        if (logoPreview) {
            localStorage.setItem('websiteLogo', logoPreview);
            toast({
                title: "Logo Saved",
                description: "The new website logo has been saved. It may take a moment to update.",
            });
            // Optionally, force a reload to see changes immediately in the header
             setTimeout(() => window.location.reload(), 1000);
        }
    };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground">Oversee and manage all aspects of OccasionCraft.</p>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendors">Manage Vendors</TabsTrigger>
          <TabsTrigger value="events">Manage Events</TabsTrigger>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
          <TabsTrigger value="settings">Site Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>Approve, manage, and view all event vendors.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events Hosted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-muted-foreground">{vendor.email}</div>
                      </TableCell>
                      <TableCell><Badge variant={vendor.status === 'Approved' ? 'default' : 'secondary'} className={vendor.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{vendor.status}</Badge></TableCell>
                      <TableCell>{vendor.events}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            {vendor.status === 'Pending' && <DropdownMenuItem>Approve</DropdownMenuItem>}
                            <DropdownMenuItem>Suspend</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Monitor and manage all events on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tickets Sold</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell><div className="font-medium">{event.name}</div></TableCell>
                      <TableCell><div className="text-sm text-muted-foreground">{event.vendor}</div></TableCell>
                      <TableCell><Badge variant={event.status === 'Published' ? 'default' : 'outline'}>{event.status}</Badge></TableCell>
                      <TableCell>{event.tickets}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Event</DropdownMenuItem>
                            <DropdownMenuItem>Unpublish</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all registered user accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {sampleUsers.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell><Badge variant={user.role === 'Vendor' ? 'secondary' : 'outline'}>{user.role}</Badge></TableCell>
                            <TableCell>{new Date(user.joined).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuItem>Reset Password</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">Delete Account</DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Site Settings</CardTitle>
              <CardDescription>Manage general site settings and appearance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Website Logo</h3>
                    <p className="text-sm text-muted-foreground">Upload a logo to be displayed in the header.</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="w-32 h-32 bg-secondary rounded-md flex items-center justify-center">
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Logo preview" width={128} height={128} className="object-contain" />
                        ) : (
                            <span className="text-sm text-muted-foreground">Preview</span>
                        )}
                    </div>
                     <div className="flex-1">
                        <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/80">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, SVG (max. 800x400px)</p>
                            </div>
                            <Input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} />
                        </label>
                    </div>
                </div>

                 <div className="flex justify-end">
                    <Button onClick={saveLogo} disabled={!logoPreview}>Save Changes</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
