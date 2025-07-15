import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DownloadDocument = ({ document, withDownload }) => {
  if (!withDownload) return;
  const handleDownload = async () => {
    try {
      const request = `/api/files?id=${document.id}&table=${document.table}&download=true`;
      const response = await fetch(request);
      if (!response.ok) {
        const { message } = await response.json();
        toast.error(message);
        return;
      }
      toast.success("Téléchargement lancé");
      window.location.href = request;
    } catch {
      toast.error("Une erreur s'est produite");
    }
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      className="h-7 w-7 p-0 hover:bg-gray-200"
      title="Télécharger"
    >
      <Download size={16} />
    </Button>
  );
};

export default DownloadDocument;
