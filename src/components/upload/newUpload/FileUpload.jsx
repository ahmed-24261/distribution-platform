import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const acceptableTypes = ["application/zip", "application/x-zip-compressed"];
    if (
      acceptableTypes.includes(selectedFile?.type) &&
      selectedFile?.name?.endsWith(".zip")
    ) {
      setFile(selectedFile);
    } else {
      toast.error("invalid file");
    }
  };

  const handleUpload = async () => {
    try {
      if (!file) return;

      const formData = new FormData();
      formData.append("type", "file");
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const { success, message } = await response.json();

      if (success) {
        toast.success(message);
        router.push("/upload");
      } else {
        toast.error(message);
      }
    } catch {
      toast.error("Une erreur s'est produite.");
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".zip"
          onChange={(e) =>
            e.target.files && handleFileSelect(e.target.files[0])
          }
        />

        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          Glissez-déposez votre fichier .zip ici
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          ou cliquez pour parcourir votre fichier
        </p>

        {file && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md inline-block">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleUpload} disabled={!file}>
          Téléverser les fichiers
        </Button>
      </div>
    </div>
  );
};

export default FileUpload;
