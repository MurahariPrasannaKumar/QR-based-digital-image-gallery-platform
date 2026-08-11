"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateGallerySchema, type UpdateGalleryInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { GallerySummary } from "@/types/gallery";

export function GallerySettingsForm({ gallery }: { gallery: GallerySummary }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateGalleryInput>({
    resolver: zodResolver(updateGallerySchema),
    defaultValues: {
      name: gallery.name,
      description: gallery.description ?? "",
      isPublic: gallery.isPublic,
      password: "",
    },
  });

  const isPublic = form.watch("isPublic");

  async function onSubmit(values: UpdateGalleryInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to update gallery.");
        return;
      }

      toast.success("Gallery updated.");
      form.resetField("password");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gallery Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Textarea rows={3} {...field} />
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
                <FormLabel>
                  {gallery.hasPassword ? "Change Password" : "Set Password"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={
                      gallery.hasPassword ? "Leave blank to keep current password" : "At least 4 characters"
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
