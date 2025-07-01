import { AlertTriangle } from "lucide-react";

const ExtensionNotSupportedViewer = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 h-full bg-red-50 rounded-md text-red-800">
      <AlertTriangle className="w-16 h-16 text-red-600" />
      <p className="text-sm text-center w-full font-medium">
        L’extension de ce fichier n’est pas prise en charge pour l’aperçu. Vous
        pouvez le télécharger pour le consulter.
      </p>
    </div>
  );
};

export default ExtensionNotSupportedViewer;
