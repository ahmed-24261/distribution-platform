import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DocumentActions from "./DocumentActions";
import EmptyViewer from "./EmptyViewer";
import RenderTitle from "./RenderTitle";
import RenderViewer from "./RenderViewer";

const DocumentViewer = ({ document, withNavigate = false }) => {
  if (!document) return <EmptyViewer />;

  const withDownloadForFicheOnly = document.type === "fiche";
  const withPrintForFicheOnly = document.type === "fiche";
  const withDownload = document.type !== "fiche";
  const withConsult = document.type === "observation";

  return (
    <div className="h-full w-full">
      <Card className="p-0 h-full shadow-sm">
        <CardHeader className="px-4 h-12 bg-accent rounded-t-lg flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-normal flex items-center">
            <RenderTitle name={document.name} type={document.type} />
          </CardTitle>
          <DocumentActions
            document={document}
            withDownloadForFicheOnly={withDownloadForFicheOnly}
            withPrintForFicheOnly={withPrintForFicheOnly}
            withDownload={withDownload}
            withNavigate={withNavigate}
            withConsult={withConsult}
          />
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <RenderViewer document={document} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentViewer;
