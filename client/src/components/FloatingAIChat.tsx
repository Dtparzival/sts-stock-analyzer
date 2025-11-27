import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Sparkles, X, Minimize2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function FloatingAIChat() {
  const { isAuthenticated } = useAuth();
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
  const [lastClickedQuestion, setLastClickedQuestion] = useState<string | null>(null);

  // 獲取用戶最常使用的快速問題（已登入用戶）
  const { data: userTopQuestions } = (trpc as any).stock.getTopQuestions.useQuery(
    { limit: 6 },
    { enabled: isAuthenticated }
  );

  // 獲取全局熱門問題（未登入用戶）
  const { data: globalTopQuestions } = (trpc as any).stock.getGlobalTopQuestions.useQuery(
    { limit: 6 },
    { enabled: !isAuthenticated }
  );

  const chatMutation = (trpc as any).stock.chatWithAI.useMutation({
    onSuccess: (response: any) => {
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

  const compareStocksMutation = (trpc as any).stock.compareStocks.useMutation({
    onSuccess: (response: any) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.comparison
      }]);
    },
    onError: (error: any) => {
      toast.error(`股票對比失敗: ${error.message}`);
      setMessages(prev => prev.slice(0, -1));
    }
  });

  const handleSend = (content: string, quickQuestion?: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    
    // 檢測是否為多股票對比查詢（例如：「比較 TSLA 和 AAPL」）
    const compareMatch = content.match(/比較|vs|versus|compare/i);
    const stockSymbols = content.match(/\b[A-Z]{1,5}\b/g) || [];
    
    if (compareMatch && stockSymbols.length >= 2) {
      // 多股票對比分析
      compareStocksMutation.mutate({
        symbols: stockSymbols.slice(0, 5), // 最多 5 支
      });
    } else {
      // 一般 AI 聊天
      const conversationHistory = newMessages
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }));
      
      chatMutation.mutate({
        messages: conversationHistory,
        quickQuestion, // 傳遞快速問題以追蹤使用頻率
      });
    }
  };

  const handleClearMessages = () => {
    setMessages([
      {
        role: "system",
        content: "你是一位專業的美股投資顧問，擁有豐富的市場分析經驗。你可以回答關於美股投資、技術分析、基本面分析、風險管理等各方面的問題。請用繁體中文回答，並提供專業且易懂的建議。"
      },
      {
        role: "assistant",
        content: "您好！我是您的 AI 投資顧問。有什麼可以幫助您的嗎？"
      }
    ]);
  };

  const suggestedPrompts = [
    "AAPL 目前適合買入嗎？",
    "如何分析一支股票的財務健康度？",
    "什麼是技術分析中的 RSI 指標？",
  ];

  // 預設快速問題模板（當無個人化數據時使用）
  const defaultQuickTemplates = [
    "分析我的投資組合",
    "推薦低風險股票",
    "市場趋勢分析",
    "如何分散投資風險？",
    "比較 TSLA 和 AAPL",
    "股息投資策略",
  ];

  // 智能動態調整快速問題（優先顯示用戶最常使用的）
  const quickTemplates = isAuthenticated && userTopQuestions && userTopQuestions.length > 0
    ? userTopQuestions.map((q: any) => q.question)
    : !isAuthenticated && globalTopQuestions && globalTopQuestions.length > 0
    ? globalTopQuestions.map((q: any) => q.question)
    : defaultQuickTemplates;

  const handleQuickQuestion = (question: string) => {
    setLastClickedQuestion(question);
    handleSend(question, question); // 傳遞快速問題以追蹤使用頻率
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card 
        className="fixed bottom-6 right-6 p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-medium text-white">AI 投資顧問</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[650px] shadow-2xl flex flex-col z-50 bg-card overflow-hidden">
      {/* 標題欄 - 使用漸層背景 */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-semibold text-white text-lg">AI 投資顧問</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
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
          isLoading={chatMutation.isPending || compareStocksMutation.isPending}
          placeholder="輸入您的問題..."
          height="100%"
          suggestedPrompts={suggestedPrompts}
          quickTemplates={quickTemplates}
          onQuickTemplateClick={handleQuickQuestion}
          onClearMessages={handleClearMessages}
        />
      </div>
    </Card>
  );
}
