import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Target, Award, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function TransactionHistory() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // 如果未登入，顯示提示
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">需要登入</h2>
          <p className="text-muted-foreground mb-4">
            請先登入以查看您的交易歷史記錄
          </p>
          <Button onClick={() => setLocation("/")}>返回首頁</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* 頂部導航 */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/portfolio")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回投資組合
          </Button>
          <h1 className="text-3xl font-bold">交易歷史統計</h1>
          <p className="text-muted-foreground mt-1">
            分析您的交易記錄，提升投資決策
          </p>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="container py-8">
        <TransactionHistoryContent userId={user.id} />
      </div>
    </div>
  );
}

function TransactionHistoryContent({ userId }: { userId: number }) {
  // 獲取交易統計數據
  const { data: stats, isLoading } = trpc.portfolio.getTransactionStats.useQuery();

  // 預設值（當 API 返回 null 或無數據時）
  const defaultStats = {
    totalTransactions: 0,
    buyCount: 0,
    sellCount: 0,
    avgHoldingDays: 0,
    winRate: 0,
    totalProfit: 0,
    totalLoss: 0,
    netProfitLoss: 0,
    bestTrade: null,
    worstTrade: null,
  };

  const displayStats = stats || defaultStats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Activity}
          title="總交易次數"
          value={displayStats.totalTransactions}
          subtitle={`買入 ${displayStats.buyCount} 次 · 賣出 ${displayStats.sellCount} 次`}
          gradient="from-blue-500/20 to-cyan-500/20"
          iconColor="text-blue-500"
        />

        <StatCard
          icon={Target}
          title="平均持有時間"
          value={`${displayStats.avgHoldingDays} 天`}
          subtitle="從買入到賣出的平均天數"
          gradient="from-purple-500/20 to-pink-500/20"
          iconColor="text-purple-500"
        />

        <StatCard
          icon={Award}
          title="勝率"
          value={`${displayStats.winRate.toFixed(1)}%`}
          subtitle={`獲利交易 / 總交易次數`}
          gradient="from-green-500/20 to-emerald-500/20"
          iconColor="text-green-500"
        />

        <StatCard
          icon={TrendingUp}
          title="總獲利"
          value={`$${displayStats.totalProfit.toLocaleString()}`}
          subtitle="所有獲利交易的總和"
          gradient="from-green-500/20 to-teal-500/20"
          iconColor="text-green-500"
        />

        <StatCard
          icon={TrendingDown}
          title="總虧損"
          value={`$${Math.abs(displayStats.totalLoss).toLocaleString()}`}
          subtitle="所有虧損交易的總和"
          gradient="from-red-500/20 to-orange-500/20"
          iconColor="text-red-500"
        />

        <StatCard
          icon={Activity}
          title="淨損益"
          value={`$${displayStats.netProfitLoss.toLocaleString()}`}
          subtitle="總獲利 - 總虧損"
          gradient="from-indigo-500/20 to-violet-500/20"
          iconColor={
            displayStats.netProfitLoss >= 0
              ? "text-green-500"
              : "text-red-500"
          }
        />
      </div>

      {/* 空狀態提示 */}
      {displayStats.totalTransactions === 0 && (
        <Card className="p-12 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">尚無交易記錄</h3>
          <p className="text-muted-foreground mb-4">
            當您開始買賣股票後，交易統計數據將會顯示在這裡
          </p>
        </Card>
      )}

      {/* TODO: 添加交易列表、篩選器和圖表 */}
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  gradient: string;
  iconColor: string;
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  gradient,
  iconColor,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${gradient} backdrop-blur-sm`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold mb-1 truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
