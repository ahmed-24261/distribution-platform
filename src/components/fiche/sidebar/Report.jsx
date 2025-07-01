import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";

const Report = () => {
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      location: "",
      message: "",
    },
  });

  const onSubmit = (data) => {
    // to api

    setOpen(false);
    form.reset();
  };
  return (
    <>
      <div className="mt-auto p-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700"
          onClick={() => setOpen(true)}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Signaler un problème</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="max-w-[400px] bottom-16 left-[10%] fixed transform-none top-auto translate-x-0 translate-y-0 border-yellow-200 bg-yellow-50/95 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-yellow-800">
              Signaler un problème
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="location"
                rules={{
                  required: "Veuillez sélectionner la localisation de l'erreur",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-yellow-800">
                      Localisation de l'erreur
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Sélectionner où se trouve l'erreur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fiche">Fiche</SelectItem>
                          <SelectItem value="sourceDocument">
                            Document source
                          </SelectItem>
                          <SelectItem value="observation">
                            Observation
                          </SelectItem>
                          <SelectItem value="entity">Entité nommée</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                rules={{ required: "Veuillez décrire le problème rencontré" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-yellow-800">
                      Détails du problème
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez le problème rencontré..."
                        className="min-h-[120px] bg-white resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  Envoyer le signalement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Report;
