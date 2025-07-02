import { FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SectionTemplate from "./SectionTemplate";
import path from "path";
import { useFiche } from "@/contexts/FicheContext";

const SourceDocuments = () => {
  const { sourceDocuments, selectedDoc, handleDocumentClick } = useFiche();

  if (!sourceDocuments.length) return;
  return (
    <SectionTemplate title="Documents Sources" icon={FileText} defaultOpen>
      <div className="space-y-1">
        {sourceDocuments.map((doc) => {
          const id = doc?.id;
          const filePath = doc?.path;
          const hash = doc?.hash;
          const displayName = path.parse(doc?.fileName)?.name;

          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div
                  className={`px-2 py-2 rounded-md cursor-pointer text-sm transition-colors hover:bg-muted flex items-center ${
                    selectedDoc?.id === id ? "bg-muted font-medium" : ""
                  }`}
                  onClick={() =>
                    handleDocumentClick({
                      id,
                      path: filePath,
                      hash,
                      displayName,
                      type: "source",
                    })
                  }
                >
                  <FileText
                    size={14}
                    className="flex-none mr-2 text-gray-600"
                  />
                  <span className="line-clamp-1">{displayName}</span>
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{displayName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </SectionTemplate>
  );
};

export default SourceDocuments;
