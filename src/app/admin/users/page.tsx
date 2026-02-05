'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, getDoc, orderBy } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const adminSeederSchema = z.object({
  uid: z.string().min(1, "User ID is required."),
});

type AdminSeederValues = z.infer<typeof adminSeederSchema>;


export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('dateJoined', 'desc'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const seederForm = useForm<AdminSeederValues>({
    resolver: zodResolver(adminSeederSchema),
    defaultValues: { uid: "" },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  };
  
  const handleRoleChange = async (user: User, role: 'admin' | 'vendor' | 'user', isChecked: boolean) => {
    if (!firestore) return;

    const userRef = doc(firestore, 'users', user.id);
    let updatedRoles = user.roles || [];
    
    if (isChecked) {
        updatedRoles = [...new Set([...updatedRoles, role])];
    } else {
        updatedRoles = updatedRoles.filter(r => r !== role);
    }
    
    updateDocumentNonBlocking(userRef, { roles: updatedRoles });

    // Special handling for admin role to update roles_admin collection
    if (role === 'admin') {
        const adminRoleRef = doc(firestore, 'roles_admin', user.id);
        if (isChecked) {
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        } else {
            deleteDocumentNonBlocking(adminRoleRef);
        }
    }
    
    // Special handling for vendor role to create/update vendor doc
    if(role === 'vendor') {
        const vendorRef = doc(firestore, 'vendors', user.id);
        if (isChecked) {
            // User is being made a vendor
            try {
                const docSnap = await getDoc(vendorRef);
                if(!docSnap.exists()){
                     // Create a new vendor doc since one doesn't exist
                     setDocumentNonBlocking(vendorRef, {
                        id: user.id,
                        userId: user.id,
                        companyName: `${user.firstName}'s Company`,
                        contactEmail: user.email,
                        status: 'approved', // Automatically approve since it's an admin action
                        createdAt: new Date().toISOString(),
                        pricingTier: 'Free'
                     }, { merge: true });
                } else {
                    // If it exists (e.g., they were 'pending' or 'rejected'), approve them.
                    updateDocumentNonBlocking(vendorRef, { status: 'approved' });
                }
            } catch (error) {
                console.error("Failed to check/update vendor document:", error);
            }
        } else {
            // User's vendor role is being revoked. We can either delete the vendor doc
            // or set its status to 'rejected'. Let's set to rejected for now to preserve data.
             updateDocumentNonBlocking(vendorRef, { status: 'rejected' });
        }
    }

    toast({
        title: "Roles Updated",
        description: `${user.firstName}'s roles have been updated.`,
    });
  }

  const onSeederSubmit = async (data: AdminSeederValues) => {
    if (!firestore) return;

    const userRef = doc(firestore, 'users', data.uid);
    const adminRoleRef = doc(firestore, 'roles_admin', data.uid);

    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'User with that UID does not exist.' });
            return;
        }

        const userData = userDoc.data() as User;
        const updatedRoles = [...new Set([...(userData.roles || []), 'admin'])];

        // Update the user document with the new role
        updateDocumentNonBlocking(userRef, { roles: updatedRoles });
        
        // CRITICAL: Create the document in roles_admin to grant permissions
        setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });

        toast({
            title: 'Admin Role Granted',
            description: `User ${userData.firstName || data.uid} has been made an admin.`,
        });
        seederForm.reset();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to grant admin role: ${error.message}`,
        });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage all registered users on the platform.</p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Admin Seeder</CardTitle>
          <CardDescription>Manually grant admin privileges to a user by their UID.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...seederForm}>
            <form onSubmit={seederForm.handleSubmit(onSeederSubmit)} className="flex items-end gap-4">
              <FormField
                control={seederForm.control}
                name="uid"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>User ID (UID)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter user's Firebase UID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">
                <UserPlus className="mr-2 h-4 w-4" /> Make Admin
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Date Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && users && users.length > 0 ? (
                users.map((user) => (
                 <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.roles?.join(', ') || 'N/A'}</TableCell>
                    <TableCell>{user.dateJoined ? format(new Date(user.dateJoined), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={user.roles?.includes('admin')}
                                    onCheckedChange={(checked) => handleRoleChange(user, 'admin', checked)}
                                >
                                    Admin
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={user.roles?.includes('vendor')}
                                    onCheckedChange={(checked) => handleRoleChange(user, 'vendor', checked)}
                                >
                                    Vendor
                                </DropdownMenuCheckboxItem>
                                 <DropdownMenuCheckboxItem
                                    checked={user.roles?.includes('user')}
                                    onCheckedChange={(checked) => handleRoleChange(user, 'user', checked)}
                                >
                                    User
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                 </TableRow>
              ))) : (
                !isLoading && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No users found.
                        </TableCell>
                    </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
