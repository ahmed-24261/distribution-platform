import {
  PauseCircle,
  CheckCircle,
  XCircle,
  ShieldQuestion,
} from "lucide-react";

const RenderFicheStatus = ({ status }) => {
  switch (status) {
    case "suspended":
      return (
        <>
          <PauseCircle className="h-4 w-4 text-yellow-500" />
          <span className="ml-1">Suspendue</span>
        </>
      );

    case "valid":
      return (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="ml-1">Validée</span>
        </>
      );

    case "canceled":
      return (
        <>
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="ml-1">Annulée</span>
        </>
      );

    default:
      return (
        <>
          <ShieldQuestion className="h-4 w-4 text-gray-500" />
          <span className="ml-1">Inconnue</span>
        </>
      );
  }
};

export default RenderFicheStatus;
