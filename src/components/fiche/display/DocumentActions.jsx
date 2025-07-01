import DownloadForFicheOnly from "./viewerActions/DownloadForFicheOnly";
import PrintForFicheOnly from "./viewerActions/PrintForFicheOnly";
import DownloadDocument from "./viewerActions/DownloadDocument";
import ConsultDocument from "./viewerActions/ConsultDocument";
import NavigateDocuments from "./viewerActions/NavigateDocuments";
import EntireMode from "./viewerActions/EntireMode";

const DocumentActions = ({
  document,
  withDownloadForFicheOnly,
  withPrintForFicheOnly,
  withDownload,
  withNavigate,
  withConsult,
}) => {
  return (
    <div className="flex items-center space-x-1">
      <DownloadForFicheOnly
        withDownloadForFicheOnly={withDownloadForFicheOnly}
      />
      <PrintForFicheOnly withPrintForFicheOnly={withPrintForFicheOnly} />
      <NavigateDocuments document={document} withNavigate={withNavigate} />
      <ConsultDocument document={document} withConsult={withConsult} />
      <DownloadDocument document={document} withDownload={withDownload} />
      <EntireMode document={document} />
    </div>
  );
};

export default DocumentActions;
