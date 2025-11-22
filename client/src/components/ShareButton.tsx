import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  symbol: string;
  companyName: string;
  currentPrice?: number;
  priceChange?: number;
}

/**
 * 股票分享按鈕組件
 * 遵循全站風格一致性：漸層背景、陰影、過渡動畫
 */
export default function ShareButton({
  symbol,
  companyName,
  currentPrice,
  priceChange,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // 生成分享連結
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  // 生成分享文字
  const generateShareText = () => {
    let text = `查看 ${symbol}`;
    if (companyName) {
      text += ` (${companyName})`;
    }
    if (currentPrice) {
      text += ` 的股票資訊 - 當前價格: $${currentPrice.toFixed(2)}`;
    }
    if (priceChange !== undefined) {
      const sign = priceChange >= 0 ? "+" : "";
      text += ` (${sign}${priceChange.toFixed(2)}%)`;
    }
    return text;
  };

  // 複製連結
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("連結已複製到剪貼簿");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("複製連結失敗，請手動複製");
    }
  };

  // 分享到 Twitter
  const handleShareTwitter = () => {
    const text = generateShareText();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  // 分享到 Facebook
  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
  };

  // 分享到 LINE
  const handleShareLine = () => {
    const text = generateShareText();
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(text)}`;
    window.open(lineUrl, "_blank", "width=600,height=400");
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="group relative overflow-hidden border-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Share2 className="w-4 h-4 mr-2 relative z-10" />
        <span className="relative z-10">分享</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              分享股票資訊
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              選擇您想要分享的平台
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 複製連結 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="shrink-0 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* 分享按鈕 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Twitter */}
              <Button
                onClick={handleShareTwitter}
                variant="outline"
                className="w-full border-0 bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                Twitter
              </Button>

              {/* Facebook */}
              <Button
                onClick={handleShareFacebook}
                variant="outline"
                className="w-full border-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>

              {/* LINE */}
              <Button
                onClick={handleShareLine}
                variant="outline"
                className="w-full border-0 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
