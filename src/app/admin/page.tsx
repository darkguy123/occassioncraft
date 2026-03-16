
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    AreaChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    Bar,
    ResponsiveContainer,
    BarChart,
} from 'recharts';
import { DollarSign, Users, Calendar, AlertTriangle, Building } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Event, User, Vendor, Ticket } from "@/lib/types";
import { useMemo } from "react";
import { format, getMonth, parseISO, subMonths, startOfMonth } from "date-fns";
import Link from "next/link";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Robust Admin check (matches AdminLayout)
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const adminRoleDocRef = useMemoFirebase(() => user ? doc(firestore, 'roles_admin', user.uid) : null, [firestore, user]);
  
  const { data: userData } = useDoc<User>(userDocRef);
  const { data: adminRoleData } = useDoc(adminRoleDocRef);

  const isAdmin = useMemo(() => {
    const isAdminByRole = (userData?.roles || []).includes('admin');
    const isAdminByCollection = adminRoleData && Object.keys(adminRoleData).length > 0;
    return !!(isAdminByRole || isAdminByCollection);
  }, [userData, adminRoleData]);

  const { data: events } = useCollection<Event>(useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'events') : null, [firestore, isAdmin]));
  const { data: users } = useCollection<User>(useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]));
  const { data: vendors } = useCollection<Vendor>(useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'vendors') : null, [firestore, isAdmin]));
  const { data: tickets } = useCollection<Ticket>(useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'tickets') : null, [firestore, isAdmin]));

  const dashboardData = useMemo(() => {
    // Platform Revenue = Number of unique batches * 1000
    const paidTickets = tickets?.filter(t => t.isPaid) || [];
    const uniqueBatches = new Set(paidTickets.map(t => t.batchId).filter(Boolean));
    const totalRev = uniqueBatches.size * 1000;

    // Initialize full year of data
    const monthlySales = monthNames.map(month => ({ month, revenue: 0 }));
    const monthlyUsers = monthNames.map(month => ({ month, users: 0 }));

    if (paidTickets) {
      const seenBatches = new Set();
      paidTickets.forEach(ticket => {
        if(ticket.purchaseDate && ticket.batchId && !seenBatches.has(ticket.batchId)) {
            try {
                const date = parseISO(ticket.purchaseDate);
                const monthIndex = getMonth(date);
                if (monthlySales[monthIndex]) {
                    monthlySales[monthIndex].revenue += 1000;
                    seenBatches.add(ticket.batchId);
                }
            } catch (e) {}
        }
      });
    }

    if (users) {
        users.forEach(user => {
            if (user.dateJoined) {
                try {
                    const monthIndex = getMonth(parseISO(user.dateJoined));
                    if (monthlyUsers[monthIndex]) {
                        monthlyUsers[monthIndex].users += 1;
                    }
                } catch (e) {}
            }
        });
    }
    
    // Dynamic slicing: Get the last 6 months ending with current month
    const currentMonthIndex = new Date().getMonth();
    const last6SalesData = [];
    const last6UsersData = [];
    
    for (let i = 5; i >= 0; i--) {
        const idx = (currentMonthIndex - i + 12) % 12;
        last6SalesData.push(monthlySales[idx]);
        last6UsersData.push(monthlyUsers[idx]);
    }

    const pendingVendorCount = vendors?.filter(v => v.status === 'pending').length || 0;

    return {
      totalRevenue: totalRev,
      salesData: last6SalesData,
      totalUsers: users?.length || 0,
      usersData: last6UsersData,
      totalVendors: vendors?.length || 0,
      totalEvents: events?.length || 0,
      pendingApprovals: pendingVendorCount,
    }
  }, [events, users, vendors, tickets]);

  const getPercentageChange = (current: number, last: number) => {
    if (last > 0) return ((current - last) / last) * 100;
    return current > 0 ? 100 : 0;
  }

  const lastMonthSales = dashboardData.salesData.length > 1 ? dashboardData.salesData[dashboardData.salesData.length - 2].revenue : 0;
  const currentMonthSales = dashboardData.salesData.length > 0 ? dashboardData.salesData[dashboardData.salesData.length - 1].revenue : 0;
  const salesPercentageChange = getPercentageChange(currentMonthSales, lastMonthSales);

  const lastMonthUsers = dashboardData.usersData.length > 1 ? dashboardData.usersData[dashboardData.usersData.length - 2].users : 0;
  const currentMonthUsers = dashboardData.usersData.length > 0 ? dashboardData.usersData[dashboardData.usersData.length - 1].users : 0;
  const usersPercentageChange = getPercentageChange(currentMonthUsers, lastMonthUsers);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground">Monitoring platform earnings and user growth.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦{dashboardData.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
                {salesPercentageChange >= 0 ? '+' : ''}{salesPercentageChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
                {usersPercentageChange >= 0 ? '+' : ''}{usersPercentageChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Vendors</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.totalVendors}</div>
            <p className="text-xs text-muted-foreground">Active organizers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Shells created</p>
          </CardContent>
        </Card>
        <Link href="/admin/approvals">
          <Card className="hover:shadow-lg transition-shadow border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Apps</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboardData.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Revenue Flow (Recent)</CardTitle>
                <CardDescription>Platform service fees collected over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dashboardData.salesData}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `₦${Number(value) / 1000}k`} />
                        <Tooltip 
                            cursor={{stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '3 3'}}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col space-y-1 leading-none">
                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="font-bold text-primary">
                                            ₦{payload[0].value?.toLocaleString()}
                                        </span>
                                        </div>
                                    </div>
                                    </div>
                                )
                                }
                                return null
                            }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>User Growth (Recent)</CardTitle>
                <CardDescription>New account registrations over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.usersData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <Tooltip
                            cursor={{fill: 'hsl(var(--accent))', opacity: 0.2}}
                             content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col space-y-1 leading-none">
                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="font-bold text-foreground">
                                            {payload[0].value} new users
                                        </span>
                                        </div>
                                    </div>
                                    </div>
                                )
                                }
                                return null
                            }}
                        />
                        <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
