import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Users, User, LogOut, Ticket, Shield, Settings } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


export function UserNav() {
  const avatarImage = PlaceHolderImages.find(img => img.id === 'user-avatar-1');
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();

  const adminRoleRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRoleRef);


  const handleLogout = () => {
    auth.signOut();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
             {user?.photoURL ? <AvatarImage src={user.photoURL} alt="User Avatar" /> : (
               avatarImage && <AvatarImage src={avatarImage.imageUrl} alt="User Avatar" data-ai-hint={avatarImage.imageHint} />
             )}
            <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'User Name'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
           <DropdownMenuItem asChild>
            <Link href="/profile/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <Ticket className="mr-2 h-4 w-4" />
              <span>My Tickets</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/vendor/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Vendor Dashboard</span>
            </Link>
          </DropdownMenuItem>
          {!isAdminLoading && adminRole && (
            <DropdownMenuItem asChild>
                <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
                </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
