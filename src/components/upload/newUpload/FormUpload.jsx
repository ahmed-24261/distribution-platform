import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, FileText, MessageSquare, Paperclip } from "lucide-react";

const FormUpload = () => {
  const [source, setSource] = useState("");
  const [dump, setDump] = useState("");
  const [object, setObject] = useState("");
  const [summary, setSummary] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [sourceDocuments, setSourceDocuments] = useState([]);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("sourceDocuments: ", sourceDocuments);

    //const newUploadId = response.data.id;

    // router.push(`/upload/consult/${newUploadId}`);
  };

  const handleSourceDocumentSelect = (selectedDocs) => {
    if (!selectedDocs) return;

    Array.from(selectedDocs).forEach((file) => {
      const isEmailFile = file.name.toLowerCase().endsWith(".eml");
      const defaultType = isEmailFile ? "Message" : "File";

      setSourceDocuments((prev) => [
        ...prev,
        {
          file,
          type: defaultType,
          associatedEmail: null,
        },
      ]);
    });
  };

  const removeSourceDocument = (index) => {
    setSourceDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const changeDocumentType = (index, type) => {
    setSourceDocuments((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, type } : doc))
    );
  };

  const handleAssociatedEmailSelect = (index, emailSelected) => {
    if (!emailSelected || emailSelected.length === 0) return;

    setSourceDocuments((prev) =>
      prev.map((doc, i) =>
        i === index ? { ...doc, associatedEmail: emailSelected[0] } : doc
      )
    );
  };

  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case "File":
        return <FileText className="h-4 w-4 text-gray-500" />;
      case "Message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "Attachment":
        return <Paperclip className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form-name">Nom d'upload</Label>
              <Input
                id="form-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Entrez un nom pour cet upload"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Sélectionnez une source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TechCorp">TechCorp</SelectItem>
                  <SelectItem value="DataSystems">DataSystems</SelectItem>
                  <SelectItem value="InfoTech">InfoTech</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dump">Dump</Label>
            <Select value={dump} onValueChange={setDump}>
              <SelectTrigger id="dump">
                <SelectValue placeholder="Sélectionnez un dump" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dump-2023-10">Dump Octobre 2023</SelectItem>
                <SelectItem value="Dump-2023-09">
                  Dump Septembre 2023
                </SelectItem>
                <SelectItem value="Dump-2023-08">Dump Août 2023</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="object">Objet</Label>
            <Input
              id="object"
              value={object}
              onChange={(e) => setObject(e.target.value)}
              placeholder="Entrez l'objet"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Synthèse</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Entrez la synthèse"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Documents source</Label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="file"
                id="form-source-documents"
                className="hidden"
                multiple
                onChange={(e) => handleSourceDocumentSelect(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  document.getElementById("form-source-documents")?.click()
                }
              >
                Ajouter des documents
              </Button>
              <span className="text-sm text-gray-500">
                {sourceDocuments.length} document
                {sourceDocuments.length < 2 ? "" : "s"} sélectionné
                {sourceDocuments.length < 2 ? "" : "s"}
              </span>
            </div>

            {sourceDocuments.length > 0 && (
              <div className="space-y-3">
                {sourceDocuments.map((doc, index) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDocumentTypeIcon(doc.type)}
                        <span className="text-sm truncate max-w-[400px]">
                          {doc.file.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSourceDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Label
                        htmlFor={`doc-type-${index}`}
                        className="text-xs min-w-[80px]"
                      >
                        Type de document:
                      </Label>
                      <Select
                        value={doc.type}
                        onValueChange={(value) =>
                          changeDocumentType(index, value)
                        }
                      >
                        <SelectTrigger id={`doc-type-${index}`} className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="File">Fichier</SelectItem>
                          <SelectItem value="Message">Message</SelectItem>
                          <SelectItem value="Attachment">
                            Pièce jointe
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {doc.type === "Attachment" && (
                      <div className="mt-2">
                        <Label
                          htmlFor={`attachment-${index}`}
                          className="text-xs"
                        >
                          Fichier d'email associé:
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="file"
                            id={`email-${index}`}
                            className="hidden"
                            onChange={(e) =>
                              handleAssociatedEmailSelect(index, e.target.files)
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              document.getElementById(`email-${index}`)?.click()
                            }
                          >
                            Sélectionner un email
                          </Button>
                          {doc.attachmentFile && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px]">
                              {doc.attachmentFile.name}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Soumettre le formulaire</Button>
        </div>
      </form>
    </div>
  );
};

export default FormUpload;
