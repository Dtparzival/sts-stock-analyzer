import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AILoadingAnimationProps {
  type: "analysis" | "prediction";
}

const analysisSteps = [
  "正在獲取股票數據...",
  "正在分析技術指標...",
  "正在評估基本面...",
  "正在計算風險指標...",
  "正在生成投資建議...",
];

const predictionSteps = [
  "正在分析歷史趨勢...",
  "正在評估市場情緒...",
  "正在計算價格預測...",
  "正在生成趨勢報告...",
];

export default function AILoadingAnimation({ type }: AILoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = type === "analysis" ? analysisSteps : predictionSteps;
  const Icon = Loader2;

  useEffect(() => {
    // 模擬進度增長
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // 最多到 95%，等待實際完成
        return prev + Math.random() * 10;
      });
    }, 500);

    // 切換分析步驟
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* 旋轉圖標 */}
      <div className="flex justify-center">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-primary shadow-lg flex items-center justify-center relative"
        >
          <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          
          {/* 外圈進度環 */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              className="stroke-white/20"
              strokeWidth="4"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100) }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
      </div>

      {/* 進度百分比 */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        className="text-center"
      >
        <div className="text-3xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {Math.round(progress)}%
        </div>
      </motion.div>

      {/* 當前分析步驟 */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="text-base sm:text-lg font-semibold text-foreground mb-2">
          {type === "analysis" ? "AI 正在深度分析中..." : "AI 正在預測未來趨勢..."}
        </div>
        <div className="text-sm sm:text-base text-muted-foreground">
          {steps[currentStep]}
        </div>
      </motion.div>

      {/* 跳動的點 */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            className="w-2 h-2 rounded-full bg-gradient-primary"
          />
        ))}
      </div>
    </motion.div>
  );
}
