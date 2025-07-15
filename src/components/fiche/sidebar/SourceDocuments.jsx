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
          const { ext: extension, name } = path.parse(doc?.fileName);

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
                      name,
                      extension,
                      table: "documents",
                      type: "source",
                    })
                  }
                >
                  <FileText
                    size={14}
                    className="flex-none mr-2 text-gray-600"
                  />
                  <span className="line-clamp-1">{name}</span>
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </SectionTemplate>
  );
};

export default SourceDocuments;
