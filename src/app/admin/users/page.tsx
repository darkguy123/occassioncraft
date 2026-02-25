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
import { collection, query, doc, getDoc, writeBatch } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, UserPlus, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";


const adminSeederSchema = z.object({
  uid: z.string().min(1, "User ID is required."),
});

type AdminSeederValues = z.infer<typeof adminSeederSchema>;


export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: unsortedUsers, isLoading } = useCollection<User>(usersQuery);

  const sortedUsers = useMemo(() => {
    if (!unsortedUsers) return [];
    return [...unsortedUsers].sort((a, b) => {
        const dateA = a.dateJoined ? new Date(a.dateJoined).getTime() : 0;
        const dateB = b.dateJoined ? new Date(b.dateJoined).getTime() : 0;
        return dateB - dateA;
    });
  }, [unsortedUsers]);

  const filteredUsers = useMemo(() => {
    if (!sortedUsers) return [];
    if (!searchTerm) return sortedUsers;

    const lowercasedFilter = searchTerm.toLowerCase();
    return sortedUsers.filter(user =>
      (user.firstName?.toLowerCase() || '').includes(lowercasedFilter) ||
      (user.lastName?.toLowerCase() || '').includes(lowercasedFilter) ||
      (user.email?.toLowerCase() || '').includes(lowercasedFilter)
    );
  }, [sortedUsers, searchTerm]);

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

    if (role === 'admin') {
        const adminRoleRef = doc(firestore, 'roles_admin', user.id);
        if (isChecked) {
            setDocumentNonBlocking(adminRoleRef, { isAdmin: true }, { merge: true });
        } else {
            deleteDocumentNonBlocking(adminRoleRef);
        }
    }
    
    if(role === 'vendor') {
        const vendorRef = doc(firestore, 'vendors', user.id);
        if (isChecked) {
            try {
                const docSnap = await getDoc(vendorRef);
                if(!docSnap.exists()){
                     setDocumentNonBlocking(vendorRef, {
                        id: user.id,
                        userId: user.id,
                        companyName: `${user.firstName}'s Company`,
                        contactEmail: user.email,
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        pricingTier: 'Free'
                     }, { merge: true });
                } else {
                    setDocumentNonBlocking(vendorRef, { status: 'approved' }, { merge: true });
                }
            } catch (error) {
                console.error("Failed to check/update vendor document:", error);
            }
        } else {
             setDocumentNonBlocking(vendorRef, { status: 'rejected' }, { merge: true });
        }
    }

    toast({
        title: "Roles Updated",
        description: `${user.firstName}'s roles have been updated.`,
    });
  }

  const confirmDeleteUser = () => {
    if (!userToDelete || !firestore) return;

    const userRef = doc(firestore, 'users', userToDelete.id);
    const adminRoleRef = doc(firestore, 'roles_admin', userToDelete.id);
    const vendorRef = doc(firestore, 'vendors', userToDelete.id);

    deleteDocumentNonBlocking(userRef);
    deleteDocumentNonBlocking(adminRoleRef);
    deleteDocumentNonBlocking(vendorRef);

    toast({
        title: "User Deleted",
        description: `${userToDelete.firstName} ${userToDelete.lastName} has been successfully deleted.`,
    });
    setUserToDelete(null);
    setSelectedUserIds(prev => prev.filter(id => id !== userToDelete.id));
  }

  const handleBulkDelete = async () => {
    if (!firestore || selectedUserIds.length === 0) return;

    const batch = writeBatch(firestore);
    
    selectedUserIds.forEach(userId => {
        batch.delete(doc(firestore, 'users', userId));
        batch.delete(doc(firestore, 'roles_admin', userId));
        batch.delete(doc(firestore, 'vendors', userId));
    });

    try {
        await batch.commit();
        toast({
            title: "Bulk Deletion Successful",
            description: `${selectedUserIds.length} users have been deleted.`,
        });
        setSelectedUserIds([]);
        setIsBulkDeleteDialogOpen(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Bulk Deletion Failed",
            description: error.message,
        });
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
        setSelectedUserIds([]);
    } else {
        setSelectedUserIds(filteredUsers.map(u => u.id));
    }
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

        updateDocumentNonBlocking(userRef, { roles: updatedRoles });
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>A list of all user accounts.</CardDescription>
            </div>
            {selectedUserIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedUserIds.length})
                </Button>
            )}
          </div>
          <div className="pt-4 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Search by name or email..."
                className="max-w-sm pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox 
                        checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                    />
                </TableHead>
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
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                 <TableRow key={user.id} className={selectedUserIds.includes(user.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                        <Checkbox 
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => toggleSelectUser(user.id)}
                            aria-label={`Select ${user.firstName}`}
                        />
                    </TableCell>
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => setUserToDelete(user)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                 </TableRow>
              ))) : (
                !isLoading && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        {searchTerm ? `No users found for "${searchTerm}".` : "No users found."}
                        </TableCell>
                    </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>. 
              This action is irreversible and will also remove their vendor profile if they have one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Delete Users</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{selectedUserIds.length}</strong> users. 
              This action is irreversible and will permanently remove their accounts and associated vendor profiles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Delete All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
