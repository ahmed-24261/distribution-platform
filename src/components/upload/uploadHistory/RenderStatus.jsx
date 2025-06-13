import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  TriangleAlert,
} from "lucide-react";

const RenderStatus = ({ status }) => {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-800 flex items-center gap-1 font-normal"
        >
          <Clock className="h-3 w-3 text-purple-600" />
          En attente
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-800 flex items-center gap-1 font-normal"
        >
          <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
          En cours
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-800 flex items-center gap-1 font-normal"
        >
          <CheckCircle className="h-3 w-3 text-green-600" />
          Terminé
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-800 flex items-center gap-1 font-normal"
        >
          <XCircle className="h-3 w-3 text-red-600" />
          Échoué
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-gray-800 flex items-center gap-1 font-normal"
        >
          <TriangleAlert className="h-3 w-3 text-gray-600" />
          Inconnu
        </Badge>
      );
  }
};

export default RenderStatus;
