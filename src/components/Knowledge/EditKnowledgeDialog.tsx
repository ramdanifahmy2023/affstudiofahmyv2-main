// src/components/Knowledge/EditKnowledgeDialog.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea"; 
import { ProcessedKnowledgeData } from "@/pages/Knowledge"; 

// Skema validasi Zod
const knowledgeFormSchema = z.object({
  title: z.string().min(5, { message: "Judul wajib diisi (min. 5 karakter)." }),
  category: z.enum(["SOP", "Tutorial", "Kebijakan", "Lainnya"]), 
  content_type: z.enum(["YouTube", "Google Drive", "Teks"]), 
  content: z.string().min(10, { message: "Konten atau Link wajib diisi." }),
  tags: z.string().optional().nullable(), 
});

type KnowledgeFormValues = z.infer<typeof knowledgeFormSchema>;

interface EditKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; 
  knowledgeToEdit: ProcessedKnowledgeData | null;
}

// Helper untuk Reverse Processing
const reverseProcessContent = (item: ProcessedKnowledgeData | null) => {
    if (!item) return "";
    // Biarkan konten apa adanya, karena edit form akan otomatis
    // mengkonversi ulang saat submit.
    return item.content;
}

export const EditKnowledgeDialog = ({ open, onOpenChange, onSuccess, knowledgeToEdit }: EditKnowledgeDialogProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<KnowledgeFormValues>({
    resolver: zodResolver(knowledgeFormSchema),
    defaultValues: {
      category: "SOP",
      content_type: "Teks",
      title: "",
      content: "",
      tags: null
    },
  });

  const contentType = form.watch("content_type");

  // Isi form saat data tersedia
  useEffect(() => {
    if (knowledgeToEdit && open) {
        // Gabungkan array tags menjadi string (dipisahkan koma)
        const tagsString = knowledgeToEdit.tags?.join(', ') || '';

        form.reset({
            title: knowledgeToEdit.title,
            category: knowledgeToEdit.category as any,
            content_type: knowledgeToEdit.type,
            content: reverseProcessContent(knowledgeToEdit),
            tags: tagsString,
        });
    }
  }, [knowledgeToEdit, open, form]);

  const onSubmit = async (values: KnowledgeFormValues) => {
    if (!knowledgeToEdit) return;
    setLoading(true);
    try {
      // Proses 'content' (sama seperti AddKnowledgeDialog)
      let finalContent = values.content;
      if (values.content_type === "YouTube") {
        const videoId = values.content.match(/(?:v=)([^&]+)/)?.[1] || values.content.split('/').pop();
        if (videoId) {
           finalContent = `https://www.youtube.com/embed/${videoId}`;
        }
      } else if (values.content_type === "Google Drive") {
        finalContent = values.content.replace("/view", "/preview").replace("/edit", "/preview");
      }

      // Proses 'tags' dari string "a, b, c" menjadi array ["a", "b", "c"]
      const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // Simpan tipe konten di tags array
      const tagsWithTipe = [...tagsArray, `__type:${values.content_type}`]; 

      const { error } = await supabase
        .from("knowledge_base")
        .update({
          title: values.title,
          category: values.category,
          content: finalContent, 
          tags: tagsWithTipe,
          // created_by tidak diubah
        })
        .eq('id', knowledgeToEdit.id);

      if (error) throw error;

      toast.success("Materi berhasil diperbarui.");
      onSuccess(); 
    } catch (error: any) {
      console.error(error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Materi: {knowledgeToEdit?.title}</DialogTitle>
          <DialogDescription>
            Perbarui detail materi SOP/Tutorial.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul Materi</FormLabel>
                  <FormControl>
                    <Input placeholder="Cth: Cara Live Streaming Shopee A-Z" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SOP">SOP</SelectItem>
                        <SelectItem value="Tutorial">Tutorial</SelectItem>
                        <SelectItem value="Kebijakan">Kebijakan</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Konten</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="YouTube">Link YouTube</SelectItem>
                        <SelectItem value="Google Drive">Link Google Drive</SelectItem>
                        <SelectItem value="Teks">Teks Biasa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {contentType === 'Teks' ? 'Isi Konten' : 'Link/URL'}
                  </FormLabel>
                  <FormControl>
                    {contentType === 'Teks' ? (
                      <Textarea
                        placeholder="Tuliskan materi di sini..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    ) : (
                      <Input 
                        placeholder={contentType === 'YouTube' ? 'Link YouTube Embed (contoh: https://www.youtube.com/embed/...) atau URL biasa' : 'Link Google Drive (pastikan link share "Anyone with the link")'} 
                        {...field} 
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="shopee, live, tips" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    Pisahkan dengan koma (cth: shopee, live, tips).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};