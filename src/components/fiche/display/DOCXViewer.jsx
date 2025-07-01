import DocViewer, { DocViewerRenderers } from "react-doc-viewer";

const DOCXViewer = ({ path }) => {
  const docs = [
    {
      uri: `/api/fiche/${encodeURIComponent(path)}`,
      fileType: "docx",
    },
  ];

  return (
    <div className="h-full w-full">
      <DocViewer
        documents={docs}
        pluginRenderers={DocViewerRenderers}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
};

export default DOCXViewer;
