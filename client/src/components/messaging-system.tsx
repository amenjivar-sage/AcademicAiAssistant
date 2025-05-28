import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Inbox, Mail, User, Clock } from "lucide-react";
import type { Message, User as UserType, InsertMessage } from "@shared/schema";

interface MessagingSystemProps {
  currentUserId: number;
  currentUserRole: "teacher" | "student";
  recipientId?: number;
  recipientName?: string;
  children: React.ReactNode;
}

const messageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  receiverId: z.number(),
});

type MessageForm = z.infer<typeof messageSchema>;

export default function MessagingSystem({ 
  currentUserId, 
  currentUserRole, 
  recipientId, 
  recipientName, 
  children 
}: MessagingSystemProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");
  const { toast } = useToast();

  // Get inbox messages
  const { data: inboxMessages } = useQuery<(Message & { sender: UserType })[]>({
    queryKey: [`/api/messages/inbox/${currentUserId}`],
    enabled: open,
  });

  // Get sent messages
  const { data: sentMessages } = useQuery<(Message & { receiver: UserType })[]>({
    queryKey: [`/api/messages/sent/${currentUserId}`],
    enabled: open,
  });

  // Get available recipients (students for teachers, teachers for students)
  const { data: availableRecipients } = useQuery<UserType[]>({
    queryKey: [`/api/users/recipients/${currentUserRole}`],
    enabled: open,
  });

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: "",
      content: "",
      receiverId: recipientId || 0,
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageForm) => {
      const messageData: InsertMessage = {
        ...data,
        senderId: currentUserId,
      };
      return await apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify(messageData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/sent/${currentUserId}`] });
      toast({
        title: "Message Sent!",
        description: "Your message has been delivered successfully.",
      });
      form.reset();
      setActiveTab("sent");
    },
    onError: () => {
      toast({
        title: "Failed to Send Message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest(`/api/messages/${messageId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/inbox/${currentUserId}`] });
    },
  });

  const onSubmit = (data: MessageForm) => {
    sendMessageMutation.mutate(data);
  };

  const handleMessageClick = (message: Message) => {
    if (!message.isRead && message.receiverId === currentUserId) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const unreadCount = inboxMessages?.filter(m => !m.isRead).length || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
            {unreadCount > 0 && (
              <Badge className="bg-red-500">
                {unreadCount} unread
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            {inboxMessages?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500">Your received messages will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {inboxMessages?.map((message) => (
                  <Card 
                    key={message.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      !message.isRead ? "border-l-4 border-l-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => handleMessageClick(message)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {message.sender.firstName} {message.sender.lastName}
                          </span>
                          {!message.isRead && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(message.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <CardTitle className="text-base">{message.subject}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm">{message.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compose" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {!recipientId && (
                  <FormField
                    control={form.control}
                    name="receiverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <FormControl>
                          <select 
                            className="w-full p-2 border rounded"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          >
                            <option value="">Select recipient...</option>
                            {availableRecipients?.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.role})
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientId && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Sending to: {recipientName}
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter message subject..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Type your message here..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={sendMessageMutation.isPending}
                  className="w-full"
                >
                  {sendMessageMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentMessages?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sent messages</h3>
                  <p className="text-gray-500">Messages you send will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sentMessages?.map((message) => (
                  <Card key={message.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">To:</span>
                          <span className="font-medium">
                            {message.receiver.firstName} {message.receiver.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(message.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <CardTitle className="text-base">{message.subject}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm">{message.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}