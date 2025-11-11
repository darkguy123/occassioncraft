import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground">Oversee and manage all aspects of OccasionCraft.</p>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vendors">Manage Vendors</TabsTrigger>
          <TabsTrigger value="events">Manage Events</TabsTrigger>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
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

      </Tabs>
    </div>
  );
}
