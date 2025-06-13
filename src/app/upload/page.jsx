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
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

import RenderStatus from "@/components/upload/uploadHistory/RenderStatus";
import RenderType from "@/components/upload/uploadHistory/RenderType";

const UploadHistory = () => {
  const [uploads, setUploads] = useState([]);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const response = await fetch("api/upload");
      const { data, error } = await response.json();
      console.log(data);
      if (!error) {
        setUploads(data);
      } else {
        alert(error.message);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRun = async (id) => {
    toast({
      title: "Traitement en cours",
      description:
        "Le fichier est en cours de traitement. Veuillez patienter...",
    });
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id ? { ...upload, status: "Processing" } : upload
      )
    );

    const { success, data, message } = await runUpload(id);

    toast({
      title: success ? "Traitement terminé" : "Échec du traitement",
      description: message,
      variant: success ? "default" : "destructive",
    });

    setUploads((prev) =>
      prev.map((upload) => (upload.id === id ? data : upload))
    );
  };

  const handleDownload = async (filePath, fileName) => {
    const request = `/api/download?filePath=${filePath}&fileName=${fileName}`;
    try {
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error();
      }
      toast({
        title: "Téléchargement lancé",
        description: "Votre fichier est en cours de téléchargement.",
      });
      window.location.href = request;
    } catch {
      toast({
        title: "Erreur lors du téléchargement",
        description: "Impossible de récupérer le fichier. Veuillez réessayer.",
      });
    }
  };

  const handleDelete = async (id) => {
    const { success, data: deletedUploadId, message } = await deleteUpload(id);

    setUploads((prev) =>
      prev.filter((upload) => upload.id !== deletedUploadId)
    );

    toast({
      title: success ? "Ressource supprimée" : "Échec de la suppression",
      description: message,
      variant: success ? "default" : "destructive",
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
                <TableHead className="w-[13%]">Utilisateur</TableHead>
                <TableHead className="w-[12%]">Statut</TableHead>
                <TableHead className="w-[13%]">Fiches réussies</TableHead>
                <TableHead className="w-[12%]">Type</TableHead>
                <TableHead className="w-[15%]">Date</TableHead>
                <TableHead className="text-center w-[15%]">Actions</TableHead>
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
                        {upload.successfulFichesCount}/{upload.totalFichesCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RenderType type={upload.type} />
                    </TableCell>
                    <TableCell>{upload.date}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        {upload.status === "Pending" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRun(upload.id)}
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
