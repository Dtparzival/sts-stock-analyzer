import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Target, Award, AlertCircle, Search, Filter, ArrowUpDown } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <ArrowLeft className="h-5 w-5 text-white" />
            </div>
            <Button
              variant="ghost"
              onClick={() => setLocation("/portfolio")}
              className="hover:bg-primary/10 font-semibold"
            >
              返回投資組合
            </Button>
          </div>
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

      {/* 視覺化圖表 */}
      {displayStats.totalTransactions > 0 && (
        <TransactionCharts userId={userId} />
      )}

      {/* 交易列表 */}
      {displayStats.totalTransactions > 0 && (
        <TransactionList userId={userId} />
      )}
    </div>
  );
}

function TransactionCharts({ userId }: { userId: number }) {
  const { data: transactions, isLoading } = trpc.portfolio.getTransactions.useQuery({});

  // 按月份統計交易次數
  const monthlyData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const monthMap = new Map<string, { buy: number; sell: number }>();
    
    transactions.forEach(t => {
      const date = new Date(t.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { buy: 0, sell: 0 });
      }
      
      const data = monthMap.get(monthKey)!;
      if (t.transactionType === 'buy') {
        data.buy++;
      } else {
        data.sell++;
      }
    });
    
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        買入: data.buy,
        賣出: data.sell,
      }));
  }, [transactions]);

  // 買入/賣出比例
  const typeDistribution = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const buyCount = transactions.filter(t => t.transactionType === 'buy').length;
    const sellCount = transactions.filter(t => t.transactionType === 'sell').length;
    
    return [
      { name: '買入', value: buyCount, color: '#10b981' },
      { name: '賣出', value: sellCount, color: '#ef4444' },
    ];
  }, [transactions]);

  // 各股票交易次數 Top 10
  const stockFrequency = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const stockMap = new Map<string, number>();
    
    transactions.forEach(t => {
      const count = stockMap.get(t.symbol) || 0;
      stockMap.set(t.symbol, count + 1);
    });
    
    return Array.from(stockMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, count]) => ({
        symbol,
        交易次數: count,
      }));
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 交易次數趨勢圖 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="lg:col-span-2"
      >
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold">交易次數趨勢</h3>
            <p className="text-sm text-muted-foreground">每月買入/賣出次數變化</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="買入" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="賣出" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* 買入/賣出比例圓餅圖 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold">交易類型分布</h3>
            <p className="text-sm text-muted-foreground">買入/賣出比例</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* 各股票交易次數 Top 10 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold">最常交易股票 Top 10</h3>
            <p className="text-sm text-muted-foreground">按交易次數排序</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stockFrequency}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="symbol" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="交易次數" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>
    </div>
  );
}

function TransactionList({ userId }: { userId: number }) {
  // 獲取交易記錄
  const { data: transactions, isLoading } = trpc.portfolio.getTransactions.useQuery({});

  // 篩選和排序狀態
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "symbol">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 篩選和排序邏輯
  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions) return [];

    let result = [...transactions];

    // 交易類型篩選
    if (typeFilter !== "all") {
      result = result.filter(t => t.transactionType === typeFilter);
    }

    // 股票代碼搜尋
    if (searchQuery) {
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.companyName && t.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "date") {
        comparison = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      } else if (sortBy === "amount") {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortBy === "symbol") {
        comparison = a.symbol.localeCompare(b.symbol);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [transactions, typeFilter, searchQuery, sortBy, sortOrder]);

  // 分頁邏輯
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / pageSize);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 重置頁碼當篩選條件改變
  React.useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, searchQuery, sortBy, sortOrder, pageSize]);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* 標題 */}
        <div>
          <h2 className="text-2xl font-bold">交易記錄</h2>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filteredAndSortedTransactions.length} 筆交易
          </p>
        </div>

        {/* 篩選器和搜尋 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 股票代碼搜尋 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋股票代碼或名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 交易類型篩選 */}
          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="交易類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部交易</SelectItem>
              <SelectItem value="buy">買入</SelectItem>
              <SelectItem value="sell">賣出</SelectItem>
            </SelectContent>
          </Select>

          {/* 排序方式 */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger>
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">按日期</SelectItem>
              <SelectItem value="amount">按金額</SelectItem>
              <SelectItem value="symbol">按股票代碼</SelectItem>
            </SelectContent>
          </Select>

          {/* 排序順序 */}
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "升序" : "降序"}
          </Button>
        </div>

        {/* 交易表格 */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>股票代碼</TableHead>
                <TableHead>公司名稱</TableHead>
                <TableHead>交易類型</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead className="text-right">價格</TableHead>
                <TableHead className="text-right">總金額</TableHead>
                <TableHead>交易日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    沒有找到符合條件的交易記錄
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.symbol}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.companyName || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={transaction.transactionType === "buy" ? "default" : "secondary"}
                        className={transaction.transactionType === "buy" ? "bg-green-500" : "bg-red-500"}
                      >
                        {transaction.transactionType === "buy" ? "買入" : "賣出"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{transaction.shares}</TableCell>
                    <TableCell className="text-right">
                      ${transaction.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${transaction.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.transactionDate).toLocaleDateString("zh-TW")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分頁控制 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每頁顯示</span>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">筆</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              上一頁
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {currentPage} / {totalPages} 頁
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              下一頁
            </Button>
          </div>
        </div>
      </div>
    </Card>
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
