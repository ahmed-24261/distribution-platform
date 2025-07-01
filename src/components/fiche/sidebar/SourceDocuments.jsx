import { FileText } from "lucide-react";
import SidebarSection from "./SidebarSection";
import { useFiche } from "@/contexts/FicheContext";

const SourceDocuments = () => {
  const { sourceDocuments, selectedDoc, handleDocumentClick } = useFiche();

  if (!sourceDocuments.length) return;
  return (
    <SidebarSection title="Documents Sources" icon={FileText} defaultOpen>
      <div className="space-y-1">
        {sourceDocuments.map((doc) => (
          <div
            key={doc.id}
            className={`px-2 py-2 rounded-md cursor-pointer text-sm transition-colors hover:bg-muted flex items-center ${
              selectedDoc?.id === doc.id ? "bg-muted font-medium" : ""
            }`}
            onClick={() => handleDocumentClick(doc)}
          >
            <FileText size={14} className="mr-2 text-gray-600" />
            <span>{doc.name}</span>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
};

export default SourceDocuments;
