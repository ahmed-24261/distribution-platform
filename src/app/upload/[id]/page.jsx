"use client";

import {
  Check,
  X,
  Eye,
  Download,
  File,
  PauseCircle,
  CheckCircle,
  XCircle,
  Trash2,
  Flag,
  Copy,
  ListFilter,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";

import RenderFicheStatus from "@/components/upload/consultUpload/RenderFicheStatus";

const ConsultUpload = ({ params }) => {
  const { id } = use(params);
  const [upload, setUpload] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState({
    fiches: [],
    failedFiches: [],
  });
  const [selectAll, setSelectAll] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/upload?id=${id}`);
      const { success, data, message } = await response.json();
      if (success) {
        if (!data.length) {
          notFound();
        } else {
          setUpload(data[0]);
        }
      } else {
        alert(message);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const selectedCount =
      selectedItems.fiches.length + selectedItems.failedFiches.length;

    if (selectedCount === 0) {
      setSelectAll(false);
    }
  }, [selectedItems]);

  const handleDownloadUpload = async (id) => {
    try {
      const request = `/api/upload?id=${id}&download=true`;

      const response = await fetch(request);
      if (!response.ok) {
        const { message } = await response.json();
        toast.error("Erreur lors du téléchargement", {
          description: message,
        });
        return;
      }
      toast.success("Téléchargement lancé", {
        description: "Le téléversement est en cours de téléchargement",
      });

      window.location.href = request;
    } catch {
      toast.error("Une erreur s'est produite");
    }
  };

  const handleDownloadFiche = async (id) => {
    try {
      const request = `/api/fiche?id=${id}&download=true`;

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
      toast.error("Une erreur s'est produite");
    }
  };

  const handleDownloadFailedFiche = async (id) => {
    try {
      const request = `/api/failedFiche?id=${id}&download=true`;

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
      toast.error("Une erreur s'est produite");
    }
  };

  const handleDownloadBulk = async () => {
    try {
      const ficheIds = selectedItems.fiches;
      const queryParams = ficheIds.map((id) => `id=${id}`).join("&");

      const request = `/api/fiche?${queryParams}&download=true`;

      const response = await fetch(request);
      if (!response.ok) {
        const { message } = await response.json();
        toast.error("Erreur lors du téléchargement", {
          description: message,
        });
        return;
      }
      toast.success("Téléchargement lancé", {
        description: "Votre ressources est en cours de téléchargement",
      });

      window.location.href = request;
    } catch {
      toast.error("Une erreur s'est produite");
    }
  };

  const handleDeleteFiche = async (id) => {
    const response = await fetch(`/api/fiche?id=${id}`, {
      method: "DELETE",
    });

    const { success, message, data } = await response.json();
    console.log("data: ", data);

    if (success) {
      setUpload((prev) => ({
        ...prev,
        fiches: prev.fiches.filter((fiche) => !data.includes(fiche.id)),
      }));

      setSelectedItems((prev) => ({
        ...prev,
        fiches: prev.fiches.filter((item) => !data.includes(item)),
      }));
      toast.success("Suppression réussie", {
        description: message,
      });
    } else {
      toast.error("Échec de la suppression", {
        description: message,
      });
    }
  };

  const handleDeleteFailedFiche = async (id) => {
    const response = await fetch(`/api/failedFiche?id=${id}`, {
      method: "DELETE",
    });

    const { success, message, data } = await response.json();

    if (success) {
      setUpload((prev) => ({
        ...prev,
        failedFiches: prev.failedFiches.filter(
          (fiche) => !data.includes(fiche.id)
        ),
      }));
      setSelectedItems((prev) => ({
        ...prev,
        failedFiches: prev.failedFiches.filter((item) => !data.includes(item)),
      }));
      toast.success("Suppression réussie", {
        description: message,
      });
    } else {
      toast.error("Échec de la suppression", {
        description: message,
      });
    }
  };

  const handleDeleteBulk = async () => {
    const successResult = [];
    const messageResult = [];
    const dataResult = { fiches: [], failedFiches: [] };

    if (selectedItems.fiches.length) {
      const searchParams = [];

      selectedItems.fiches.forEach((id) => {
        searchParams.push(`id=${id}`);
      });

      const response = await fetch(`/api/fiche?${searchParams.join("&")}`, {
        method: "DELETE",
      });
      const { success, message, data } = await response.json();
      successResult.push(success);
      messageResult.push(message);
      dataResult.fiches = data;
    }

    if (selectedItems.failedFiches.length) {
      const searchParams = [];

      selectedItems.failedFiches.forEach((id) => {
        searchParams.push(`id=${id}`);
      });

      const response = await fetch(`/api/fiche?${searchParams.join("&")}`, {
        method: "DELETE",
      });
      const { success, message, data } = await response.json();
      successResult.push(success);
      messageResult.push(message);
      dataResult.failedFiches = data;
    }

    setUpload((prev) => ({
      ...prev,
      fiches: prev.fiches.filter(
        (fiche) => !dataResult.fiches.includes(fiche.id)
      ),
      failedFiches: prev.failedFiches.filter(
        (fiche) => !dataResult.failedFiches.includes(fiche.id)
      ),
    }));

    setSelectedItems((prev) => ({
      fiches: prev.fiches.filter((item) => !dataResult.fiches.includes(item)),
      failedFiches: prev.failedFiches.filter(
        (item) => !dataResult.failedFiches.includes(item)
      ),
    }));

    if (successResult.every(Boolean)) {
      toast.success("Suppression réussie", {
        description: messageResult.join("\n"),
      });
    } else {
      toast.error("Échec de la suppression", {
        description: messageResult.join("\n"),
      });
    }
  };

  const handleReportFiche = async (id) => {};

  const handleReportFailedFiche = async (id) => {};

  const handleReportBulk = async (id) => {};

  const handleChangeStatus = (newStatus, id) => {
    if (id) {
      setUpload((prev) => ({
        ...prev,
        fiches: prev.fiches.map((fiche) =>
          fiche.id === id ? { ...fiche, newStatus } : fiche
        ),
      }));
    } else {
      setUpload((prev) => ({
        ...prev,
        fiches: prev.fiches.map((fiche) =>
          selectedItems.fiches.includes(fiche.id)
            ? { ...fiche, newStatus }
            : fiche
        ),
      }));
    }
  };

  const handleCopyZipFileName = () => {
    navigator.clipboard.writeText(upload.fileName);
  };

  const cancelChanges = () => {
    setUpload((prev) => ({
      ...prev,
      fiches: prev.fiches.map((fiche) => ({ ...fiche, newStatus: null })),
    }));
  };

  const applyChanges = async () => {
    const fichesToBeUpdate = upload.fiches
      .filter((fiche) => fiche.status !== fiche.newStatus && fiche.newStatus)
      .map((fiche) => ({ id: fiche.id, update: { status: fiche.newStatus } }));

    const response = await fetch("/api/fiche", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fichesToBeUpdate),
    });

    const { success, message, data } = await response.json();

    if (success) {
      setUpload((prev) => ({
        ...prev,
        fiches: prev.fiches.map((fiche) =>
          data.includes(fiche.id)
            ? {
                ...fiche,
                status: fiche.newStatus,
                newStatus: null,
              }
            : fiche
        ),
      }));

      setSelectedItems((prev) => ({
        ...prev,
        fiches: prev.fiches.filter((item) => !data.includes(item)),
        failedFiches: [],
      }));

      toast.success("Mettre à jour réussie", {
        description: message,
      });
    } else {
      toast.error("Échec de la mise à jour", {
        description: message,
      });
    }
  };

  const toggleSelectItem = (id, type) => {
    if (type === "success") {
      if (selectedItems.fiches.includes(id)) {
        setSelectedItems((prev) => ({
          ...prev,
          fiches: prev.fiches.filter((item) => item !== id),
        }));
      } else {
        setSelectedItems((prev) => ({ ...prev, fiches: [...prev.fiches, id] }));
      }
    } else if (type === "failed") {
      if (selectedItems.failedFiches.includes(id)) {
        setSelectedItems((prev) => ({
          ...prev,
          failedFiches: prev.failedFiches.filter((item) => item !== id),
        }));
      } else {
        setSelectedItems((prev) => ({
          ...prev,
          failedFiches: [...prev.failedFiches, id],
        }));
      }
    }
  };

  const toggleSelectAll = () => {
    setSelectAll((prev) => !prev);

    if (selectAll) setSelectedItems({ fiches: [], failedFiches: [] });
    else {
      const ficheIds =
        filter !== "failed" ? upload.fiches.map((f) => f.id) : [];
      const failedIds =
        filter !== "success" ? upload.failedFiches.map((f) => f.id) : [];

      setSelectedItems({ fiches: ficheIds, failedFiches: failedIds });
    }
  };

  const toggleFilter = (value) => {
    setSelectAll(false);
    setFilter(value);
    setSelectedItems({ fiches: [], failedFiches: [] });
  };

  if (!upload) return null;

  const total = upload.fiches.length + upload.failedFiches.length;
  const successCount = upload.fiches.length;
  const failedCount = upload.failedFiches.length;
  const selectedCount =
    selectedItems.fiches.length + selectedItems.failedFiches.length;
  const pendingCount = upload.fiches.filter(
    (fiche) => fiche.newStatus && fiche.newStatus !== fiche.status
  ).length;

  let index = 0;
  return (
    <div className="px-6 py-4 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        {/* Title */}
        <h2 className="text-xl font-semibold">
          Consulter téléversement:{" "}
          <span className="bg-gray-100 rounded-2xl px-4 py-1 text-gray-600">
            {upload.displayName}
          </span>
        </h2>
        {/* Top-Right section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700 truncate max-w-[200px]">
                    {upload.fileName}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{upload.fileName}</p>
              </TooltipContent>
            </Tooltip>

            <div className="ml-2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyZipFileName}
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="h-4 w-4 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copier le nom</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadUpload(upload.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Télécharger le fichier</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="text-sm bg-gray-100 px-3 py-1 rounded-full font-medium">
            <span className="text-green-600">{successCount}</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-700">{total}</span>
            <span className="ml-1 text-gray-600">fiches réussies</span>
          </div>
        </div>
      </div>

      {/* Filter Toggle Group */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Filtrer :</span>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => toggleFilter(value || "all")}
        >
          <ToggleGroupItem value="all" aria-label="Tous les résultats">
            Tous ({total})
          </ToggleGroupItem>
          <ToggleGroupItem value="success" aria-label="Résultats réussis">
            Succès ({successCount})
          </ToggleGroupItem>
          <ToggleGroupItem value="failed" aria-label="Résultats échoués">
            Échoué ({failedCount})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Bulk actions */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={toggleSelectAll}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            {selectAll ? "Tout désélectionner" : "Tout sélectionner"}
          </Label>
          <span className="text-gray-400 text-sm">|</span>
          <span className="text-sm text-gray-500">
            {selectedCount} fiche{selectedCount < 2 ? "" : "s"} sélectionnée
            {selectedCount < 2 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadBulk}
                disabled={selectedCount === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Télécharger la sélection</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteBulk()}
                disabled={selectedCount === 0}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Supprimer la sélection</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReportBulk()}
                disabled={selectedCount === 0}
              >
                <Flag className="h-4 w-4 text-orange-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Signaler la sélection</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedCount === 0 || filter === "failed"}
                    className="flex items-center gap-1"
                  >
                    <ListFilter className="h-4 w-4 text-blue-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => handleChangeStatus("suspended")}
                    className="flex items-center cursor-pointer"
                  >
                    <PauseCircle className="mr-2 h-4 w-4 text-yellow-500" />
                    Suspendue
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleChangeStatus("valid")}
                    className="flex items-center cursor-pointer"
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Validé
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleChangeStatus("canceled")}
                    className="flex items-center cursor-pointer"
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    Annulé
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>
              <p>Modifier le statut</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {pendingCount !== 0 && (
        <Alert className="flex items-center justify-between bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-700">
            {pendingCount} modification{pendingCount < 2 ? "" : "s"} en attente.
            Veuillez appliquer ou annuler les changements.
          </AlertDescription>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelChanges}
              className="h-8 px-2 py-1"
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={applyChanges}
              className="h-8 px-2 py-1"
            >
              Appliquer
            </Button>
          </div>
        </Alert>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Statut d'upload</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-center w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {total === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-4 text-gray-500"
                >
                  Aucun résultat disponible
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filter !== "failed" && (
                  <>
                    {upload.fiches.map((fiche) => {
                      index++;
                      return (
                        <TableRow
                          key={fiche.id}
                          className={
                            fiche.newStatus && fiche.newStatus !== fiche.status
                              ? "bg-blue-50"
                              : ""
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.fiches.includes(fiche.id)}
                              onCheckedChange={() =>
                                toggleSelectItem(fiche.id, "success")
                              }
                            />
                          </TableCell>
                          <TableCell>{index}</TableCell>
                          <TableCell className="font-medium">
                            {fiche.ref}
                          </TableCell>
                          <TableCell>{fiche.source}</TableCell>
                          <TableCell>
                            <Badge
                              variant="success"
                              className="inline-flex items-center bg-green-100 text-green-800 hover:bg-green-200"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              <span>Succès</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`flex items-center justify-start w-28 px-2 h-8 ${
                                    fiche.newStatus &&
                                    fiche.newStatus !== fiche.status
                                      ? "border border-blue-300"
                                      : ""
                                  }`}
                                >
                                  <RenderFicheStatus
                                    status={fiche.newStatus || fiche.status}
                                  />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleChangeStatus("suspended", fiche.id)
                                  }
                                  className="flex items-center cursor-pointer"
                                >
                                  <PauseCircle className="mr-2 h-4 w-4 text-yellow-500" />
                                  Suspendue
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleChangeStatus("valid", fiche.id)
                                  }
                                  className="flex items-center cursor-pointer"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Validé
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleChangeStatus("canceled", fiche.id)
                                  }
                                  className="flex items-center cursor-pointer"
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Annulé
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>
                            Fiche a été téléversé avec succès
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild variant="ghost" size="sm">
                                    <Link href={`/fiche/${fiche.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Consulter la fiche</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDownloadFiche(fiche.id)
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
                                    onClick={() => handleReportFiche(fiche.id)}
                                  >
                                    <Flag className="h-4 w-4 text-orange-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Signaler</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteFiche(fiche.id)}
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
                      );
                    })}
                  </>
                )}

                {filter !== "success" && (
                  <>
                    {upload.failedFiches.map((fiche) => {
                      index++;
                      return (
                        <TableRow key={fiche.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.failedFiches.includes(
                                fiche.id
                              )}
                              onCheckedChange={() =>
                                toggleSelectItem(fiche.id, "failed")
                              }
                            />
                          </TableCell>
                          <TableCell>{index}</TableCell>
                          <TableCell className="font-medium">———</TableCell>
                          <TableCell>{fiche.source}</TableCell>
                          <TableCell>
                            <Badge
                              variant="destructive"
                              className="inline-flex items-center bg-red-100 text-red-800 hover:bg-red-200"
                            >
                              <X className="mr-1 h-3 w-3" />
                              <span>Échec</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center justify-start w-28 px-2 h-8"
                              disabled
                            >
                              <XCircle className="mr-2 h-4 w-4 text-red-500" />
                              <span>Annulé</span>
                            </Button>
                          </TableCell>
                          <TableCell>{fiche.message}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDownloadFailedFiche(fiche.id)
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
                                    onClick={() =>
                                      handleReportFailedFiche(fiche.id)
                                    }
                                  >
                                    <Flag className="h-4 w-4 text-orange-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Signaler</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteFailedFiche(fiche.id)
                                    }
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
                      );
                    })}
                  </>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ConsultUpload;
