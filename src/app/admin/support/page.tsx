'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { SupportTicket } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MessageSquare, Send, Inbox, Tag, Clock, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<SupportTicket['status'], string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    closed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

export default function AdminSupportPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const ticketsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'support_tickets'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: tickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyText, setReplyText] = useState('');
    const [newStatus, setNewStatus] = useState<SupportTicket['status']>('open');
    const [isSaving, setIsSaving] = useState(false);

    const openTicket = (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setReplyText(ticket.adminReply || '');
        setNewStatus(ticket.status);
    };

    const handleSave = async () => {
        if (!selectedTicket || !firestore) return;
        setIsSaving(true);
        try {
            const ticketRef = doc(firestore, 'support_tickets', selectedTicket.id);
            await updateDoc(ticketRef, {
                adminReply: replyText.trim(),
                status: newStatus,
                repliedAt: new Date().toISOString(),
            });
            toast({ title: 'Saved', description: 'Reply and status updated successfully.' });
            setSelectedTicket(null);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save changes.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Inbox className="h-7 w-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-headline font-bold">Support Messages</h1>
                    <p className="text-sm text-muted-foreground">Review and respond to user support requests.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            ) : !tickets || tickets.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No support messages yet.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket) => (
                        <Card
                            key={ticket.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => openTicket(ticket)}
                        >
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold truncate">{ticket.subject}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />{ticket.email}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Tag className="h-3 w-3" />{ticket.category}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(ticket.createdAt), 'MMM d, yyyy · h:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.message}</p>
                                </div>
                                <Button variant="outline" size="sm" className="shrink-0" onClick={(e) => { e.stopPropagation(); openTicket(ticket); }}>
                                    Open
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reply Dialog */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-xl">{selectedTicket?.subject}</DialogTitle>
                        <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedTicket?.email}</span>
                            <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{selectedTicket?.category}</span>
                            {selectedTicket && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(selectedTicket.createdAt), 'MMMM d, yyyy · h:mm a')}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* User message */}
                        <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">User Message</p>
                            <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap border">
                                {selectedTicket?.message}
                            </div>
                        </div>

                        {/* Previous reply preview */}
                        {selectedTicket?.adminReply && (
                            <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Previous Reply</p>
                                <div className="bg-primary/5 rounded-lg p-4 text-sm whitespace-pre-wrap border border-primary/20">
                                    {selectedTicket.adminReply}
                                </div>
                            </div>
                        )}

                        {/* Reply box */}
                        <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Your Reply</p>
                            <Textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply to the user..."
                                className="min-h-[120px] resize-none"
                            />
                        </div>

                        {/* Status selector */}
                        <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Update Status</p>
                            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as SupportTicket['status'])}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSelectedTicket(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Send className="h-4 w-4" />
                                    Save Reply
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
