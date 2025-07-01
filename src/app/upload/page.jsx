"use client";

import { Download, Plus, Eye, Play, Trash2 } from "lucide-react";
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
import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import RenderStatus from "@/components/upload/uploadHistory/RenderStatus";
import RenderType from "@/components/upload/uploadHistory/RenderType";

import { DateTime } from "luxon";

const UploadHistory = () => {
  const [uploads, setUploads] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch("api/upload");
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
    const response = await fetch("api/upload/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, task: "process" }),
    });

    const { success, data, message } = await response.json();

    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === data ? { ...upload, status: "processing" } : upload
      )
    );

    if (success) {
      toast.success("Traitement commencé", {
        description: message,
      });
    } else {
      toast.error("Échec du traitement", {
        description: message,
      });
    }
  };

  const handleDownload = async (filePath, fileName) => {
    try {
      let request = `/api/download?filePath=${filePath}`;

      if (fileName) {
        request = request + `&fileName=${fileName}`;
      }
      const response = await fetch(request);
      if (!response.ok) {
        const { message } = await response.json();
        toast.error("Erreur lors du téléchargement", {
          description: message,
        });
        return;
      }
      toast.success("Téléchargement lancé", {
        description: "Votre ressource est en cours de téléchargement",
      });

      window.location.href = request;
    } catch {
      toast.error("Erreur lors du téléchargement", {
        description: "Impossible de récupérer la ressource. Veuillez réessayer",
      });
    }
  };
  const handleDelete = async (id) => {
    const response = await fetch(`api/upload?id=${id}`, {
      method: "DELETE",
    });

    const { success, data, message } = await response.json();

    setUploads((prev) => prev.filter((upload) => upload.id !== data));

    toast(success ? "Téléversement supprimé" : "Échec de la suppression", {
      description: message,
    });
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
                <TableHead className="w-[5%]">#</TableHead>
                <TableHead className="w-[15%]">Téléversement</TableHead>
                <TableHead className="w-[15%]">Utilisateur</TableHead>
                <TableHead className="w-[15%]">Statut</TableHead>
                <TableHead className="w-[10%]">Fiches réussies</TableHead>
                <TableHead className="w-[10%]">Type</TableHead>
                <TableHead className="w-[20%]">Date</TableHead>
                <TableHead className="text-center w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
                      {upload.displayName}
                    </TableCell>
                    <TableCell>{upload.username}</TableCell>

                    <TableCell>
                      <div className="flex">
                        <RenderStatus status={upload.status} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded-md font-medium">
                        {upload.fiches.length}/
                        {upload.fiches.length + upload.failedFiches.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RenderType type={upload.type} />
                    </TableCell>
                    <TableCell>
                      {DateTime.fromISO(upload.date)
                        .setLocale("fr")
                        .toFormat("dd MMMM yyyy à HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-end space-x-2 pr-5">
                        {upload.status === "pending" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleProcess(upload.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Lancer</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/upload/${upload.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Consulter</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDownload(upload.path, upload.fileName)
                              }
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Télécharger</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(upload.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Supprimer</p>
                          </TooltipContent>
                        </Tooltip>
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
