"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createGallerySchema, type CreateGalleryInput } from "@/lib/validations";
import { uploadImagesToGallery } from "@/lib/upload-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageUploader } from "@/components/upload/image-uploader";

export function GalleryForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<"idle" | "creating" | "uploading">("idle");

  const form = useForm<CreateGalleryInput>({
    resolver: zodResolver(createGallerySchema),
    defaultValues: { name: "", description: "", isPublic: true, password: "" },
  });

  const isPublic = form.watch("isPublic");

  async function onSubmit(values: CreateGalleryInput) {
    setIsSubmitting(true);
    setStage("creating");
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to create gallery.");
        return;
      }

      const gallery = json.data as { id: string; slug: string };

      if (files.length > 0) {
        setStage("uploading");
        const result = await uploadImagesToGallery(gallery.id, files, setProgress);
        if (!result.success) {
          toast.error(result.error ?? "Some images failed to upload.");
          router.push(`/dashboard/galleries/${gallery.id}`);
          router.refresh();
          return;
        }
      }

      toast.success("Gallery created.");
      router.push(`/dashboard/galleries/${gallery.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setStage("idle");
      setProgress(null);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gallery Name</FormLabel>
                <FormControl>
                  <Input placeholder="Wedding Photos" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Optional description" rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value ? "public" : "protected"}
                    onValueChange={(v) => field.onChange(v === "public")}
                    className="gap-3"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="public" />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="protected" />
                      Password Protected
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isPublic && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gallery Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 4 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Upload Images</label>
          <ImageUploader files={files} onFilesChange={setFiles} disabled={isSubmitting} />
        </div>

        {stage === "uploading" && progress !== null && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Uploading images... {progress}%</p>
            <Progress value={progress} />
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {stage === "creating" && "Creating gallery..."}
          {stage === "uploading" && "Uploading images..."}
          {stage === "idle" && "Create Gallery"}
        </Button>
      </form>
    </Form>
  );
}
