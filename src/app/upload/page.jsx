"use client";

import {
  Download,
  Plus,
  Eye,
  Play,
  Trash2,
  FileText,
  LayoutList,
  Cloud,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  TriangleAlert,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { DateTime } from "luxon";

const UploadHistory = () => {
  const [uploads, setUploads] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch("api/uploads");
      const { success, data, message } = await response.json();
      if (success) {
        setUploads(data);
      } else {
        alert("GET api/upload: " + message);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcess = async (id) => {
    try {
      setUploads((prev) =>
        prev.map((upload) =>
          upload.id === id
            ? {
                ...upload,
                process: {
                  status: "processing",
                  attempt: upload?.process?.attempt
                    ? upload?.process?.attempt + 1
                    : 1,
                },
              }
            : upload
        )
      );

      toast.success("Téléversement en cours de traitement");

      const response = await fetch(`api/uploads/process?id=${id}`);

      const { success, data, message } = await response.json();

      setUploads((prev) =>
        prev.map((upload) =>
          data && upload.id === data.id
            ? { ...upload, process: data.process }
            : upload
        )
      );

      if (success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch {
      toast.error("Une erreur s'est produite");
    }
  };

  const handleDownload = async (id) => {
    try {
      const request = `/api/uploads/download?id=${id}`;

      const response = await fetch(request);
      if (!response.ok) {
        const { message } = await response.json();
        toast.error(message);
        return;
      }

      toast.success("Téléchargement lancé");

      window.location.href = request;
    } catch (e) {
      console.log(e);
      toast.error("Une erreur s'est produite");
    }
  };

  const handleDelete = async (id) => {
    try {
      const request = `api/uploads?id=${id}`;

      const response = await fetch(request, { method: "DELETE" });

      const { success, data, message } = await response.json();

      setUploads((prev) => prev.filter((upload) => !data.includes(upload.id)));

      if (success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch {
      toast.error("Une erreur s'est produite");
    }
  };

  return (
    <TooltipProvider>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Historique des téléversements
          </h2>
          <Button asChild>
            <Link href="/upload/new-upload">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau téléversement
            </Link>
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nom de téléversement</TableHead>
                <TableHead>Téléversé par</TableHead>
                <TableHead>Téléversé le</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Traité par</TableHead>
                <TableHead>Traité le</TableHead>
                <TableHead>Tentative</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-4 text-gray-500"
                  >
                    Aucun historique de téléversement trouvé
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((upload, index) => (
                  <TableRow key={upload.id}>
                    <TableCell>{index + 1}</TableCell>

                    <TableCell className="font-medium">
                      {displayName(upload)}
                    </TableCell>

                    <TableCell>{upload.username}</TableCell>

                    <TableCell>{formatDate(upload.uploaded_at)}</TableCell>

                    <TableCell>
                      <RenderType type={upload.type} />
                    </TableCell>

                    <TableCell>
                      {upload?.process?.username || "-----"}
                    </TableCell>

                    <TableCell>
                      {formatDate(upload?.process?.started_at)}
                    </TableCell>

                    <TableCell>{upload?.process?.attempt || 0}</TableCell>

                    <TableCell>
                      <RenderStatus status={upload?.process?.status} />
                    </TableCell>

                    <TableCell>
                      <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded-md font-medium">
                        {`${upload.fiches.length}/${
                          upload.fiches.length + upload.failedFiches.length
                        } fiches validées`}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex justify-end space-x-2 pr-5">
                        {!upload?.process?.status && (
                          <ActionButton
                            text="Lancer"
                            onClick={() => handleProcess(upload.id)}
                          >
                            <Play className="h-4 w-4 text-green-600" />
                          </ActionButton>
                        )}

                        {upload?.process?.status === "failed" && (
                          <ActionButton
                            text="Relancer"
                            onClick={() => handleProcess(upload.id)}
                          >
                            <RotateCcw className="h-4 w-4 text-green-600" />
                          </ActionButton>
                        )}

                        <ActionButton
                          text="Consulter"
                          onClick={() => handleDownload(upload.id)}
                        >
                          <Link href={`/upload/${upload.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </ActionButton>

                        <ActionButton
                          text="Télécharger"
                          onClick={() => handleDownload(upload.id)}
                        >
                          <Download className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          text="Supprimer"
                          onClick={() => handleDelete(upload.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default UploadHistory;

const displayName = (upload) => {
  const formatDate = DateTime.fromISO(upload.uploaded_at)
    .setLocale("fr")
    .toFormat("ddMMMyyyy");

  return `${formatDate}-${upload.type}`;
};

const formatDate = (date) => {
  const dt = DateTime.fromISO(date);
  return dt.isValid
    ? dt.setLocale("fr").toFormat("dd MMM yyyy à HH:mm")
    : "-----";
};

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
          <TriangleAlert className="w-4 h-4" />
          Inconnu
        </Badge>
      );
  }
};

const RenderStatus = ({ status }) => {
  switch (status) {
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
          className="bg-purple-50 text-purple-800 flex items-center gap-1 font-normal"
        >
          <Clock className="h-3 w-3 text-purple-600" />
          En attente
        </Badge>
      );
  }
};

const ActionButton = ({ children, onClick, text }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
};
