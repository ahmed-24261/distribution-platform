import PDFViewer from "./PDFViewer";
//import DOCXViewer from "./DOCXViewer";
import ExtensionNotSupportedViewer from "./ExtensionNotSupportedViewer";

import * as pathLib from "path";

const RenderViewer = ({ path }) => {
  const extension = pathLib.extname(path);
  switch (extension) {
    case ".pdf":
      return <PDFViewer path={path} />;
    // return <DOCXViewer path={path} />;
    case ".xlsx":
      break;
    default:
      return <ExtensionNotSupportedViewer />;
  }
};

export default RenderViewer;
