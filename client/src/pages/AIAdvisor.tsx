import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { ArrowLeft, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AIAdvisor() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "你是一位專業的美股投資顧問，擁有豐富的市場分析經驗。你可以回答關於美股投資、技術分析、基本面分析、風險管理等各方面的問題。請用繁體中文回答，並提供專業且易懂的建議。"
    },
    {
      role: "assistant",
      content: "您好！我是您的 AI 投資顧問。我可以協助您：\n\n- 分析特定股票的投資價值\n- 解讀財務報表和技術指標\n- 提供投資策略建議\n- 評估市場趨勢和風險\n- 回答任何美股相關問題\n\n請隨時提出您的問題，我會盡力為您提供專業的建議！"
    }
  ]);

  const chatMutation = trpc.stock.chatWithAI.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.message
      }]);
    },
    onError: (error) => {
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
    "如何建立一個平衡的投資組合？",
    "美股市場目前的整體趨勢如何？",
    "如何判斷股票是否被高估或低估？",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首頁
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">AI 投資顧問</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>專業投資諮詢</CardTitle>
              <CardDescription>
                與 AI 投資顧問對話，獲取專業的美股投資建議和市場分析
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-6">
              <AIChatBox
                messages={messages}
                onSendMessage={handleSend}
                isLoading={chatMutation.isPending}
                placeholder="輸入您的問題，例如：「AAPL 目前適合買入嗎？」"
                height="600px"
                emptyStateMessage="開始與 AI 投資顧問對話"
                suggestedPrompts={suggestedPrompts}
              />
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>免責聲明：</strong>
              AI 投資顧問提供的建議僅供參考，不構成投資建議。投資有風險，請根據自身情況謹慎決策。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
