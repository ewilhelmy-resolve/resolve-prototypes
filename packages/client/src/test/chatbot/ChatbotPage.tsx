"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

const models: ChatModel[] = [
  { id: "gpt-4", name: "GPT-4", description: "Most capable model" },
  { id: "claude-3", name: "Claude 3", description: "Anthropic's latest" },
  { id: "gemini-pro", name: "Gemini Pro", description: "Google's advanced model" },
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm Rita, your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const simulateAssistantResponse = useCallback((userMessage: string) => {
    const responseId = Date.now().toString();
    const streamingMessage: Message = {
      id: responseId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, streamingMessage]);

    // Simulate streaming response
    const responses = [
      "I understand you're asking about: " + userMessage,
      "Let me help you with that. Here are some key points:",
      "1. This is a simulated response",
      "2. The actual implementation will connect to your Rita API",
      "3. We'll support document uploads and real-time messaging",
      "Is there anything specific you'd like to know more about?"
    ];

    const fullResponse = responses.join("\n\n");
    let currentIndex = 0;

    const streamInterval = setInterval(() => {
      if (currentIndex < fullResponse.length) {
        const nextChar = fullResponse[currentIndex];
        setMessages(prev =>
          prev.map(msg =>
            msg.id === responseId
              ? { ...msg, content: msg.content + nextChar }
              : msg
          )
        );
        currentIndex++;
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === responseId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
        setIsLoading(false);
        clearInterval(streamInterval);
      }
    }, 30);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      simulateAssistantResponse(userMessage.content);
    }, 500);
  }, [input, isLoading, simulateAssistantResponse]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold">Rita AI Chatbot</h1>
              <Badge variant="secondary">Beta</Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex max-w-[80%] space-x-2 ${
                    message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <Card className={`${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    <CardContent className="p-3">
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                        {message.isStreaming && (
                          <span className="animate-pulse">▋</span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="min-h-[60px] max-h-[200px] resize-none pr-12"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 bottom-2 h-8 w-8 p-0"
                onClick={() => {
                  // TODO: Implement file upload
                  console.log("File upload clicked");
                }}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {isLoading && (
            <div className="flex items-center space-x-2 mt-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-transparent"></div>
              <span>Rita is thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Development Notes Panel */}
      <div className="w-80 border-l bg-muted/50 p-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🚧 Development Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Implemented:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Basic chat UI with shadcn components</li>
                <li>• Message streaming simulation</li>
                <li>• Model selection dropdown</li>
                <li>• Auto-scroll management</li>
                <li>• Responsive layout</li>
                <li>• Keyboard shortcuts (Enter to send)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🔄 Next Steps:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Connect to Rita API endpoints</li>
                <li>• Implement real SSE streaming</li>
                <li>• Add file upload functionality</li>
                <li>• Integrate UX Figma components</li>
                <li>• Add conversation history</li>
                <li>• Add error handling</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-purple-600">🎨 UX Integration:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Awaiting UX components via CLI</li>
                <li>• Current implementation uses shadcn blocks</li>
                <li>• Ready for component swapping</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}