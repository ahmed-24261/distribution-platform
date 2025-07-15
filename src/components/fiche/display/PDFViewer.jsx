const PDFViewer = ({ document }) => {
  const id = document.id;
  const table = document.table;
  return (
    <div className="h-full w-full">
      <iframe
        src={`/api/files?id=${id}&table=${table}&file=true`}
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );
};

export default PDFViewer;
