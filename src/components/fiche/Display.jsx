"use client";
import { useFiche } from "@/contexts/FicheContext";
import DocumentViewer from "@/components/fiche/display/DocumentViewer";

const Display = () => {
  const { fiche, selectedDoc, entireMode } = useFiche();

  const id = fiche?.id;
  const name = fiche?.object;

  const ficheDoc = {
    id,
    name,
    extension: ".pdf",
    table: "fiches",
    type: "fiche",
  };

  return !entireMode ? (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-3/5 flex flex-col p-4 overflow-hidden bg-muted/20">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <DocumentViewer document={ficheDoc} />
          </div>
        </div>
      </div>

      <div className="w-2/5 flex flex-col p-4 overflow-hidden bg-gray-50 border-l h-full">
        <div className="flex-1 overflow-hidden">
          <div className="h-full">
            <DocumentViewer document={selectedDoc} withNavigate />
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="w-full h-full flex-1 overflow-hidden">
      <div className="w-full h-full p-4 overflow-hidden bg-muted/20">
        <div className="w-full h-full flex-1 overflow-hidden">
          <div className="h-full">
            <DocumentViewer document={selectedDoc} withNavigate />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Display;
