import { FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PDFViewer from "./PDFViewer";
import DOCXViewer from "./DOCXViewer";
import DocumentActions from "./DocumentActions";
import EmptyViewer from "./EmptyViewer";
import ExtensionNotSupportedViewer from "./ExtensionNotSupportedViewer";

const DocumentViewer = ({ document, withNavigate = false }) => {
  if (!document) return <EmptyViewer />;

  const withDownloadForFicheOnly = document.docType === "fiche";
  const withPrintForFicheOnly = document.docType === "fiche";
  const withDownload = document.docType !== "fiche";
  const withConsult = document.docType === "observation";

  const extension = document.extension;

  const renderTitle = (documentName, documentType) => {
    switch (documentType) {
      case "fiche":
        return (
          <>
            <FileText size={16} className="mr-2 text-muted-foreground" />
            <span className="font-semibold">Fiche</span>: {documentName}
          </>
        );
      case "source":
        return (
          <>
            <FileText size={16} className="mr-2 text-muted-foreground" />
            <span className="font-semibold">Source</span>: {documentName}
          </>
        );
      case "observation":
        return (
          <>
            <FileText size={16} className="mr-2 text-muted-foreground" />
            <span className="font-semibold">Observation</span>: {documentName}
          </>
        );
      default:
        return (
          <>
            <FileText size={16} className="mr-2 text-muted-foreground" />
            <span className="font-semibold">Inconnue</span>: {documentName}
          </>
        );
    }
  };

  const renderViewer = (extension) => {
    switch (extension) {
      case ".pdf":
        return <PDFViewer path={document.path} />;
      case ".docx":
        return <DOCXViewer path={document.path} />;
      case ".xlsx":
        break;
      default:
        return <ExtensionNotSupportedViewer />;
    }
  };

  return (
    <div className="h-full w-full">
      <Card className="h-full shadow-sm">
        <CardHeader className="py-2 px-4 bg-accent rounded-t-lg border-b flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium flex items-center">
            {renderTitle(document.name, document.docType)}
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
        <CardContent className="p-0 h-[calc(100%-40px)]">
          {renderViewer(extension)}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentViewer;
