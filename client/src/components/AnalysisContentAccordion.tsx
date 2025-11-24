import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Streamdown } from "streamdown";

interface AnalysisContentAccordionProps {
  analysis: string;
}

interface Section {
  title: string;
  content: string;
  icon: typeof FileText;
}

export default function AnalysisContentAccordion({ analysis }: AnalysisContentAccordionProps) {
  // 將分析內容分段
  const parseAnalysisIntoSections = (text: string): Section[] => {
    const sections: Section[] = [];
    
    // 嘗試按標題分段（Markdown 標題格式）
    const markdownSections = text.split(/(?=^#{1,3}\s)/m);
    
    if (markdownSections.length > 1) {
      // 如果有 Markdown 標題，按標題分段
      markdownSections.forEach((section, index) => {
        const lines = section.trim().split('\n');
        if (lines.length === 0) return;
        
        const titleMatch = lines[0].match(/^#{1,3}\s+(.+)/);
        const title = titleMatch ? titleMatch[1] : `第 ${index + 1} 部分`;
        const content = titleMatch ? lines.slice(1).join('\n').trim() : section.trim();
        
        if (content.length > 0) {
          sections.push({
            title,
            content,
            icon: getIconForSection(title)
          });
        }
      });
    } else {
      // 如果沒有 Markdown 標題，按段落分段
      const paragraphs = text.split(/\n\n+/);
      const chunkSize = Math.ceil(paragraphs.length / 3);
      
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n');
        if (chunk.trim().length > 0) {
          sections.push({
            title: getSectionTitle(i / chunkSize),
            content: chunk.trim(),
            icon: getIconForIndex(i / chunkSize)
          });
        }
      }
    }
    
    return sections;
  };

  const getIconForSection = (title: string) => {
    if (title.includes('趨勢') || title.includes('預測') || title.includes('展望')) return TrendingUp;
    if (title.includes('風險') || title.includes('警示') || title.includes('注意')) return AlertTriangle;
    if (title.includes('建議') || title.includes('策略') || title.includes('結論')) return Lightbulb;
    return FileText;
  };

  const getIconForIndex = (index: number) => {
    const icons = [FileText, TrendingUp, AlertTriangle, Lightbulb];
    return icons[Math.floor(index) % icons.length];
  };

  const getSectionTitle = (index: number) => {
    const titles = ['市場概況', '趨勢分析', '風險評估', '投資建議'];
    return titles[Math.floor(index) % titles.length];
  };

  const sections = parseAnalysisIntoSections(analysis);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0]) // 預設只展開第一個段落
  );

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {sections.map((section, index) => {
        const isExpanded = expandedSections.has(index);
        const Icon = section.icon;
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="border-2 border-purple-100 dark:border-purple-900 rounded-xl overflow-hidden bg-white/50 dark:bg-black/20 shadow-sm"
          >
            {/* 標題按鈕 */}
            <button
              onClick={() => toggleSection(index)}
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-foreground text-left break-words">
                  {section.title}
                </h4>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 ml-2"
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>

            {/* 內容區域 */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 pt-0 border-t border-purple-100 dark:border-purple-900">
                    <div className="prose prose-sm sm:prose lg:prose-lg prose-slate dark:prose-invert max-w-none mt-3 sm:mt-4 lg:mt-6 [&>p]:leading-relaxed [&>p]:sm:leading-relaxed [&>p]:lg:leading-loose [&>p]:mb-3 [&>p]:sm:mb-4 [&>p]:lg:mb-6">
                      <Streamdown>{section.content}</Streamdown>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
