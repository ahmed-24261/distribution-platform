import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DownloadDocument = ({ document, withDownload }) => {
  if (!withDownload) return;
  const handleDownload = async () => {
    const request = `/api/download?filePath=${document.path}`;
    try {
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error();
      }
      toast.success("Téléchargement lancé", {
        description: "Votre document est en cours de téléchargement.",
      });
      window.location.href = request;
    } catch {
      toast.error("Erreur lors du téléchargement", {
        description: "Impossible de récupérer le document. Veuillez réessayer.",
      });
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
