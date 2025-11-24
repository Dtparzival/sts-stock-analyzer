import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Streamdown } from "streamdown";
import { TrendingUp, BarChart3, Target, AlertTriangle } from "lucide-react";

interface PredictionContentAccordionProps {
  prediction: string;
}

export default function PredictionContentAccordion({ prediction }: PredictionContentAccordionProps) {
  // 將預測內容分段處理
  const parseContent = (text: string) => {
    // 移除 Markdown 標題標記但保留內容結構
    const sections: { title: string; content: string; icon: any }[] = [];
    
    // 定義可能的段落標題和對應圖標
    const sectionPatterns = [
      { pattern: /#{1,6}\s*(短期預測|短期趨勢|近期走勢)[\s:：]*/i, title: '短期預測', icon: TrendingUp },
      { pattern: /#{1,6}\s*(中期預測|中期趨勢|中期展望)[\s:：]*/i, title: '中期預測', icon: BarChart3 },
      { pattern: /#{1,6}\s*(長期預測|長期趨勢|長期展望)[\s:：]*/i, title: '長期預測', icon: Target },
      { pattern: /#{1,6}\s*(風險提示|注意事項|風險因素)[\s:：]*/i, title: '風險提示', icon: AlertTriangle },
    ];

    let remainingText = text;
    let hasStructuredContent = false;

    // 嘗試按照標題分段
    sectionPatterns.forEach(({ pattern, title, icon }) => {
      const match = remainingText.match(pattern);
      if (match) {
        hasStructuredContent = true;
        const startIndex = match.index! + match[0].length;
        const nextSectionIndex = remainingText.slice(startIndex).search(/#{1,6}\s*/);
        
        let content;
        if (nextSectionIndex === -1) {
          content = remainingText.slice(startIndex).trim();
          remainingText = '';
        } else {
          content = remainingText.slice(startIndex, startIndex + nextSectionIndex).trim();
          remainingText = remainingText.slice(startIndex + nextSectionIndex);
        }

        if (content) {
          sections.push({ title, content, icon });
        }
      }
    });

    // 如果沒有找到結構化內容，按段落分割
    if (!hasStructuredContent) {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
      
      if (paragraphs.length >= 3) {
        sections.push(
          { title: '短期預測', content: paragraphs[0], icon: TrendingUp },
          { title: '中期預測', content: paragraphs[1], icon: BarChart3 },
          { title: '長期預測', content: paragraphs.slice(2).join('\n\n'), icon: Target }
        );
      } else {
        // 如果段落太少，直接顯示全部內容
        sections.push({ title: '預測分析', content: text, icon: TrendingUp });
      }
    }

    return sections;
  };

  const sections = parseContent(prediction);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Accordion type="multiple" defaultValue={sections.map((_, i) => `section-${i}`)} className="space-y-3 sm:space-y-4">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <AccordionItem 
              key={`section-${index}`} 
              value={`section-${index}`}
              className="border-2 rounded-xl overflow-hidden bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <AccordionTrigger className="px-3 sm:px-6 py-3 sm:py-4 hover:no-underline group">
                <div className="flex items-center gap-2 sm:gap-3 text-left">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-sm sm:text-base font-semibold text-foreground">
                    {section.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-6 lg:px-8 pb-3 sm:pb-4 lg:pb-6">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="prose prose-sm sm:prose lg:prose-lg prose-slate dark:prose-invert max-w-none pt-2 sm:pt-3 lg:pt-4 [&>p]:leading-relaxed lg:[&>p]:leading-loose [&>p]:mb-4 lg:[&>p]:mb-6"
                >
                  <Streamdown>{section.content}</Streamdown>
                </motion.div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </motion.div>
  );
}
