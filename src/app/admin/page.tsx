
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
import { DollarSign, Users, Calendar, AlertTriangle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Event, User, Vendor, UserTicket } from "@/lib/types";
import { useMemo } from "react";
import { format, getMonth, parseISO } from "date-fns";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboardPage() {
  const firestore = useFirestore();

  const { data: events } = useCollection<Event>(useMemoFirebase(() => firestore ? collection(firestore, 'events') : null, [firestore]));
  const { data: users } = useCollection<User>(useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]));
  const { data: vendors } = useCollection<Vendor>(useMemoFirebase(() => firestore ? collection(firestore, 'vendors') : null, [firestore]));
  const { data: tickets } = useCollection<UserTicket>(useMemoFirebase(() => firestore ? collection(firestore, 'tickets') : null, [firestore]));

  const { totalRevenue, salesData, totalUsers, usersData, totalEvents, pendingApprovals } = useMemo(() => {
    const revenue = tickets?.reduce((acc, ticket) => {
        const event = events?.find(e => e.id === ticket.eventId);
        return acc + (event?.price || 0);
    }, 0) || 0;

    const monthlySales = monthNames.map(month => ({ month, revenue: 0 }));
    if (tickets && events) {
      tickets.forEach(ticket => {
        const event = events.find(e => e.id === ticket.eventId);
        if (event) {
          const monthIndex = getMonth(parseISO(ticket.purchaseDate));
          monthlySales[monthIndex].revenue += event.price;
        }
      });
    }

    const monthlyUsers = monthNames.map(month => ({ month, users: 0 }));
    if (users) {
        users.forEach(user => {
            if (user.dateJoined) {
                const monthIndex = getMonth(parseISO(user.dateJoined));
                monthlyUsers[monthIndex].users += 1;
            }
        });
    }

    const pendingVendorCount = vendors?.filter(v => v.status === 'pending').length || 0;

    return {
      totalRevenue: revenue,
      salesData: monthlySales.slice(0, 6), // First 6 months for demo
      totalUsers: users?.length || 0,
      usersData: monthlyUsers.slice(0, 6),
      totalEvents: events?.length || 0,
      pendingApprovals: pendingVendorCount,
    }
  }, [events, users, vendors, tickets]);

  const lastMonthSales = salesData.length > 1 ? salesData[salesData.length - 2].revenue : 0;
  const currentMonthSales = salesData.length > 0 ? salesData[salesData.length - 1].revenue : 0;
  const salesPercentageChange = lastMonthSales > 0 ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;

  const lastMonthUsers = usersData.length > 1 ? usersData[usersData.length - 2].users : 0;
  const currentMonthUsers = usersData.length > 0 ? usersData[usersData.length - 1].users : 0;
  const usersPercentageChange = lastMonthUsers > 0 ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Here&apos;s a quick overview of your platform.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
                {usersPercentageChange >= 0 ? '+' : ''}{usersPercentageChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">Live on the platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
             <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Vendor applications awaiting review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Monthly ticket sales revenue.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
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
                <CardTitle>New Users</CardTitle>
                <CardDescription>Monthly new user sign-ups.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usersData}>
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

    