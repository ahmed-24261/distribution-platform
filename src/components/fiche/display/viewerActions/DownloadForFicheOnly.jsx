import { useState, useRef } from "react";
import { useFiche } from "@/contexts/FicheContext";
import { Download, X, GripVertical, RefreshCcw } from "lucide-react";
import { FaFilePdf, FaFileWord } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const DownloadAction = ({ withDownloadForFicheOnly }) => {
  const { sourceDocuments } = useFiche();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("pdf");
  const [downloadMode, setDownloadMode] = useState("combined");
  const [includeSourceDocs, setIncludeSourceDocs] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const parentRef = useRef(null);

  if (!withDownloadForFicheOnly) return;

  const handleIncludeSourceDocsChange = (checked) => {
    setIncludeSourceDocs(checked);
    if (checked && selectedDocs.length === 0) {
      setSelectedDocs(sourceDocuments.map((doc) => doc.id));
    }
  };

  const toggleDocSelection = (docId) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter((id) => id !== docId));
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    const reorderedDocs = [...selectedDocs];
    const [removed] = reorderedDocs.splice(sourceIndex, 1);
    reorderedDocs.splice(destinationIndex, 0, removed);

    setSelectedDocs(reorderedDocs);
  };

  const handleDownload = () => {
    // to api
    console.log(selectedDocs);
    setDownloadOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDownloadOpen(true)}
        className="h-7 w-7 p-0 hover:bg-gray-200"
        title="Télécharger"
      >
        <Download size={16} />
      </Button>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent
          ref={parentRef}
          className="w-[450px]"
          aria-describedby="download-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>Télécharger le document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Format</h4>
              <div className="flex space-x-4">
                <div
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer border ${
                    downloadFormat === "pdf"
                      ? "border-primary bg-primary/10"
                      : "border-input"
                  }`}
                  onClick={() => setDownloadFormat("pdf")}
                >
                  <FaFilePdf
                    size={18}
                    className={
                      downloadFormat === "pdf"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                  <span
                    className={
                      downloadFormat === "pdf" ? "text-primary font-medium" : ""
                    }
                  >
                    PDF
                  </span>
                </div>
                <div
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer border ${
                    downloadFormat === "word"
                      ? "border-primary bg-primary/10"
                      : "border-input"
                  }`}
                  onClick={() => setDownloadFormat("word")}
                >
                  <FaFileWord
                    size={18}
                    className={
                      downloadFormat === "word"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                  <span
                    className={
                      downloadFormat === "word"
                        ? "text-primary font-medium"
                        : ""
                    }
                  >
                    Word
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-sources-download"
                  checked={includeSourceDocs}
                  onCheckedChange={handleIncludeSourceDocsChange}
                />
                <label
                  htmlFor="include-sources-download"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Inclure les documents sources
                </label>
              </div>
            </div>

            {includeSourceDocs && (
              <div className="space-y-3 border rounded-md p-3">
                <h4 className="font-medium text-sm">Mode de téléchargement</h4>
                <Select value={downloadMode} onValueChange={setDownloadMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un mode de téléchargement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combined">
                      Téléchargement combiné
                    </SelectItem>
                    <SelectItem value="separate">
                      Téléchargement séparé
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {includeSourceDocs && (
              <div className="space-y-2 border rounded-md p-3">
                <h4 className="flex justify-between font-medium text-sm">
                  <span className="py-1"> Sélectionner les documents</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelectedDocs(sourceDocuments.map((doc) => doc.id))
                    }
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                    title="Réinitialiser"
                  >
                    <RefreshCcw />
                  </Button>
                </h4>
                <div className="max-h-[200px] overflow-y-auto">
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable
                      droppableId="source-documents"
                      className="relative"
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="overflow-y-auto space-y-2"
                        >
                          {selectedDocs.map((docId, index) => {
                            const document = sourceDocuments.find(
                              (d) => d.id === docId
                            );
                            return (
                              <DraggableDocumentItem
                                document={document}
                                index={index}
                                toggleDocSelection={toggleDocSelection}
                                parentRef={parentRef}
                              />
                            );
                          })}

                          {sourceDocuments.map((document) => {
                            if (selectedDocs.includes(document.id)) return;
                            return (
                              <UndraggableDocumentItem
                                document={document}
                                toggleDocSelection={toggleDocSelection}
                              />
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DownloadAction;

const DraggableDocumentItem = ({
  document,
  index,
  toggleDocSelection,
  parentRef,
}) => {
  const rect = parentRef.current?.getBoundingClientRect();
  if (!document) return;

  return (
    <Draggable key={document.id} draggableId={document.id} index={index}>
      {(provided, snapshot) => {
        const style = provided.draggableProps.style;
        const draggableProps = provided.draggableProps;
        draggableProps.style = {
          ...style,
          top: style.top - rect?.top,
          left: style.left - rect?.left,
        };
        return (
          <div
            ref={provided.innerRef}
            {...draggableProps}
            className={`flex items-center justify-between border-b pb-1 mb-2 ${
              snapshot.isDragging ? "opacity-70 bg-accent rounded-md px-1" : ""
            }`}
          >
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id={`doc-${document.id}`}
                checked={true}
                onCheckedChange={() => toggleDocSelection(document.id)}
              />
              <label
                htmlFor={`doc-${document.id}`}
                className="text-sm leading-none"
              >
                {document.name}
              </label>
            </div>
            <div
              {...provided.dragHandleProps}
              className="cursor-grab hover:text-primary p-1"
            >
              <GripVertical size={16} />
            </div>
          </div>
        );
      }}
    </Draggable>
  );
};

const UndraggableDocumentItem = ({ document, toggleDocSelection }) => (
  <div className="flex items-center justify-between border-b pb-1 mb-2">
    <div className="flex items-center space-x-2 py-2">
      <Checkbox
        key={`doc-${document.id}`}
        id={`doc-${document.id}`}
        checked={false}
        onCheckedChange={() => toggleDocSelection(document.id)}
      />
      <label htmlFor={`doc-${document.id}`} className="text-sm leading-none">
        {document.name}
      </label>
    </div>
  </div>
);
