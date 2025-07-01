import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const SidebarSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (onToggle) {
      onToggle(isOpen);
    }
  }, [isOpen]);

  return (
    <div className="mb-4">
      <div
        className="flex items-center py-2 px-3 hover:bg-muted/50 cursor-pointer rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon size={16} className="mr-2 text-blue-500" />}
        <h3 className="text-sm font-medium flex-1">{title}</h3>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>

      {isOpen && (
        <div className="pt-1 pb-2 px-3 text-sm animate-fade-in">{children}</div>
      )}
    </div>
  );
};

export default SidebarSection;
