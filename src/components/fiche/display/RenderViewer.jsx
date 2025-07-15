import PDFViewer from "./PDFViewer";
//import DOCXViewer from "./DOCXViewer";
import ExtensionNotSupportedViewer from "./ExtensionNotSupportedViewer";

const RenderViewer = ({ document }) => {
  const extension = document.extension;
  switch (extension) {
    case ".pdf":
      return <PDFViewer document={document} />;
    // return <DOCXViewer path={path} />;
    case ".xlsx":
      break;
    default:
      return <ExtensionNotSupportedViewer />;
  }
};

export default RenderViewer;
