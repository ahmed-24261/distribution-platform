import { FileText } from "lucide-react";

const RenderTitle = ({ displayName, type }) => {
  switch (type) {
    case "fiche":
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Fiche:</span>
          <span className="line-clamp-1">{displayName}</span>
        </>
      );
    case "source":
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Source:</span>
          <span className="line-clamp-1">{displayName}</span>
        </>
      );
    case "observation":
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Observation:</span>
          <span className="line-clamp-1">{displayName}</span>
        </>
      );
    default:
      return (
        <>
          <FileText
            size={16}
            className="flex-none mr-2 text-muted-foreground"
          />
          <span className="mr-1 font-medium">Inconnue:</span>
          <span className="line-clamp-1">{displayName}</span>
        </>
      );
  }
};

export default RenderTitle;
