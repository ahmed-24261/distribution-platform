import { FileX } from "lucide-react";

const EmptyViewer = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <FileX className="w-16 h-16 mb-4 text-gray-400" />
      <p className="text-lg font-semibold">Aucun document sélectionné</p>
      <p className="text-sm">
        Sélectionnez un document pour afficher ses détails
      </p>
    </div>
  );
};

export default EmptyViewer;
