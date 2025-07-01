const PDFViewer = ({ path }) => {
  return (
    <div className="h-full w-full">
      <iframe
        src={`/api/file/${encodeURIComponent(path)}`}
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );
};

export default PDFViewer;
