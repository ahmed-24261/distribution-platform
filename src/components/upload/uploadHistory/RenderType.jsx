import { Badge } from "@/components/ui/badge";
import { FileText, LayoutList, Cloud } from "lucide-react";

const RenderType = ({ type }) => {
  switch (type) {
    case "form":
      return (
        <Badge className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
          <LayoutList className="w-4 h-4" />
          Formulaire
        </Badge>
      );

    case "file":
      return (
        <Badge className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
          <FileText className="w-4 h-4" />
          Fichier
        </Badge>
      );

    case "api":
      return (
        <Badge className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
          <Cloud className="w-4 h-4" />
          API
        </Badge>
      );

    default:
      return (
        <Badge className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
          <FileText className="w-4 h-4" />
          Inconnu
        </Badge>
      );
  }
};

export default RenderType;
