import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, TrendingUp, Target, Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

export default function ImprovementTracking() {
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // 獲取改進計畫列表
  const { data: plans, isLoading, refetch } = trpc.analysis.getImprovementPlans.useQuery();

  // 創建改進計畫
  const createPlan = trpc.analysis.createImprovementPlan.useMutation({
    onSuccess: () => {
      toast.success("改進計畫已創建");
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  // 更新改進計畫
  const updatePlan = trpc.analysis.updateImprovementPlan.useMutation({
    onSuccess: () => {
      toast.success("改進計畫已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除改進計畫
  const deletePlan = trpc.analysis.deleteImprovementPlan.useMutation({
    onSuccess: () => {
      toast.success("改進計畫已刪除");
      setDetailDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 處理創建改進計畫表單提交
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPlan.mutate({
      problemType: formData.get("problemType") as string,
      problemTarget: formData.get("problemTarget") as string || undefined,
      problemDescription: formData.get("problemDescription") as string,
      baselineAccuracy: parseFloat(formData.get("baselineAccuracy") as string) / 100,
      targetAccuracy: parseFloat(formData.get("targetAccuracy") as string) / 100,
      improvementMeasures: formData.get("improvementMeasures") as string,
      notes: formData.get("notes") as string || undefined,
    });
  };

  // 處理狀態更新
  const handleStatusUpdate = (planId: number, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    updatePlan.mutate({
      id: planId,
      status: newStatus,
    });
  };

  // 處理刪除
  const handleDelete = (planId: number) => {
    if (confirm("確定要刪除此改進計畫嗎？")) {
      deletePlan.mutate({ id: planId });
    }
  };

  // 獲取狀態徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />待處理</Badge>;
      case "in_progress":
        return <Badge variant="default" className="bg-blue-500"><TrendingUp className="w-3 h-3 mr-1" />進行中</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />已完成</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />已取消</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 獲取問題類型標籤
  const getProblemTypeLabel = (type: string) => {
    switch (type) {
      case "overall":
        return "整體準確率";
      case "recommendation":
        return "建議類型準確率";
      case "symbol":
        return "個股準確率";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">準確度改進追蹤</h1>
              <p className="text-muted-foreground mt-1">
                識別問題、制定計畫、追蹤效果，形成持續優化循環
              </p>
            </div>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                創建改進計畫
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>創建改進計畫</DialogTitle>
                <DialogDescription>
                  識別準確率問題並制定改進措施
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="problemType">問題類型</Label>
                    <Select name="problemType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇問題類型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overall">整體準確率</SelectItem>
                        <SelectItem value="recommendation">建議類型準確率</SelectItem>
                        <SelectItem value="symbol">個股準確率</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="problemTarget">問題目標（選填）</Label>
                    <Input
                      id="problemTarget"
                      name="problemTarget"
                      placeholder="例如：買入、AAPL"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problemDescription">問題描述</Label>
                  <Textarea
                    id="problemDescription"
                    name="problemDescription"
                    placeholder="描述識別到的準確率問題..."
                    required
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baselineAccuracy">基準準確率 (%)</Label>
                    <Input
                      id="baselineAccuracy"
                      name="baselineAccuracy"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="例如：45.5"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetAccuracy">目標準確率 (%)</Label>
                    <Input
                      id="targetAccuracy"
                      name="targetAccuracy"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="例如：60.0"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="improvementMeasures">改進措施</Label>
                  <Textarea
                    id="improvementMeasures"
                    name="improvementMeasures"
                    placeholder="描述計畫採取的改進措施..."
                    required
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">備註（選填）</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="其他備註資訊..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={createPlan.isPending}>
                    {createPlan.isPending ? "創建中..." : "創建"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總計畫數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">進行中</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {plans?.filter(p => p.status === "in_progress").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已完成</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {plans?.filter(p => p.status === "completed").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">待處理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {plans?.filter(p => p.status === "pending").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 改進計畫列表 */}
        {plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">
                          {getProblemTypeLabel(plan.problemType)}
                          {plan.problemTarget && ` - ${plan.problemTarget}`}
                        </CardTitle>
                        {getStatusBadge(plan.status)}
                      </div>
                      <CardDescription>{plan.problemDescription}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <div>
                        <div className="text-sm text-muted-foreground">基準準確率</div>
                        <div className="text-lg font-semibold text-red-600">
                          {(plan.baselineAccuracy * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-sm text-muted-foreground">目標準確率</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {(plan.targetAccuracy * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {plan.currentAccuracy !== null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-sm text-muted-foreground">當前準確率</div>
                          <div className="text-lg font-semibold text-green-600">
                            {(plan.currentAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>創建於 {new Date(plan.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      {plan.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(plan.id, "in_progress")}
                        >
                          開始執行
                        </Button>
                      )}
                      {plan.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(plan.id, "completed")}
                        >
                          標記完成
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setDetailDialogOpen(true);
                        }}
                      >
                        查看詳情
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">尚無改進計畫</h3>
              <p className="text-muted-foreground mb-4">
                開始創建改進計畫，追蹤 AI 分析準確度的持續優化
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                創建第一個改進計畫
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 改進計畫詳情對話框 */}
        {selectedPlanId && (
          <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>改進計畫詳情</DialogTitle>
              </DialogHeader>
              {(() => {
                const plan = plans?.find(p => p.id === selectedPlanId);
                if (!plan) return null;
                
                return (
                  <div className="space-y-4">
                    <div>
                      <Label>問題類型</Label>
                      <div className="mt-1">
                        {getProblemTypeLabel(plan.problemType)}
                        {plan.problemTarget && ` - ${plan.problemTarget}`}
                      </div>
                    </div>
                    <div>
                      <Label>狀態</Label>
                      <div className="mt-1">{getStatusBadge(plan.status)}</div>
                    </div>
                    <div>
                      <Label>問題描述</Label>
                      <div className="mt-1 text-sm text-muted-foreground">{plan.problemDescription}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>基準準確率</Label>
                        <div className="mt-1 text-lg font-semibold text-red-600">
                          {(plan.baselineAccuracy * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <Label>目標準確率</Label>
                        <div className="mt-1 text-lg font-semibold text-blue-600">
                          {(plan.targetAccuracy * 100).toFixed(1)}%
                        </div>
                      </div>
                      {plan.currentAccuracy !== null && (
                        <div>
                          <Label>當前準確率</Label>
                          <div className="mt-1 text-lg font-semibold text-green-600">
                            {(plan.currentAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>改進措施</Label>
                      <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                        {plan.improvementMeasures}
                      </div>
                    </div>
                    {plan.notes && (
                      <div>
                        <Label>備註</Label>
                        <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {plan.notes}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(plan.id)}
                      >
                        刪除計畫
                      </Button>
                      <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                        關閉
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
