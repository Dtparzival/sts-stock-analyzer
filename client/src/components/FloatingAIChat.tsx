import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Sparkles, X, Minimize2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "你是一位專業的美股投資顧問，擁有豐富的市場分析經驗。你可以回答關於美股投資、技術分析、基本面分析、風險管理等各方面的問題。請用繁體中文回答，並提供專業且易懂的建議。"
    },
    {
      role: "assistant",
      content: "您好！我是您的 AI 投資顧問。有什麼可以幫助您的嗎？"
    }
  ]);

  const chatMutation = trpc.stock.chatWithAI.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.message
      }]);
    },
    onError: (error: any) => {
      toast.error(`AI 回應失敗: ${error.message}`);
      // 移除最後一條用戶消息（因為 AI 沒有成功回應）
      setMessages(prev => prev.slice(0, -1));
    }
  });

  const handleSend = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    
    // 只發送用戶和助手的對話歷史（不包括 system message）
    const conversationHistory = newMessages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
    
    chatMutation.mutate({
      messages: conversationHistory,
    });
  };

  const suggestedPrompts = [
    "AAPL 目前適合買入嗎？",
    "如何分析一支股票的財務健康度？",
    "什麼是技術分析中的 RSI 指標？",
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card 
        className="fixed bottom-6 right-6 p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all z-50"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium">AI 投資顧問</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl flex flex-col z-50">
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI 投資顧問</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 聊天內容 */}
      <div className="flex-1 overflow-hidden">
        <AIChatBox
          messages={messages}
          onSendMessage={handleSend}
          isLoading={chatMutation.isPending}
          placeholder="輸入您的問題..."
          height="100%"
          suggestedPrompts={suggestedPrompts}
        />
      </div>
    </Card>
  );
}
