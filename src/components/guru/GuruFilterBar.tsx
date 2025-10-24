import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface GuruFilterBarProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

const FILTER_TAGS = [
  { emoji: "🌮", label: "Tacos" },
  { emoji: "🧁", label: "Dessert" },
  { emoji: "🔥", label: "Spicy" },
  { emoji: "💸", label: "Under $10" },
  { emoji: "🕒", label: "Late Night" },
  { emoji: "🌱", label: "Vegan" },
  { emoji: "🍕", label: "Pizza" },
  { emoji: "🍜", label: "Noodles" },
  { emoji: "☕", label: "Coffee" },
  { emoji: "🍔", label: "Burgers" },
];

export function GuruFilterBar({ selectedTags, onTagToggle }: GuruFilterBarProps) {
  return (
    <div className="mb-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {FILTER_TAGS.map((tag) => (
            <Badge
              key={tag.label}
              variant={selectedTags.includes(tag.label) ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm font-medium hover-scale transition-all"
              onClick={() => onTagToggle(tag.label)}
            >
              <span className="mr-1.5">{tag.emoji}</span>
              {tag.label}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
