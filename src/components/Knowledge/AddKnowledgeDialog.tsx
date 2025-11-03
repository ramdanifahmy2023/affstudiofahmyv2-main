// src/components/Knowledge/AddKnowledgeDialog.tsx

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
import { Textarea } from "@/components/ui/textarea"; // Import Textarea

// Skema validasi Zod
const knowledgeFormSchema = z.object({
  title: z.string().min(5, { message: "Judul wajib diisi (min. 5 karakter)." }),
  category: z.enum(["SOP", "Tutorial", "Kebijakan", "Lainnya"], {
    required_error: "Kategori wajib dipilih.",
  }),
  content_type: z.enum(["YouTube", "Google Drive", "Teks"]), // Helper untuk form
  content: z.string().min(10, { message: "Konten atau Link wajib diisi." }),
  tags: z.string().optional(), // Akan kita proses jadi array
});

type KnowledgeFormValues = z.infer<typeof knowledgeFormSchema>;

interface AddKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Untuk refresh list
}

export const AddKnowledgeDialog = ({ open, onOpenChange, onSuccess }: AddKnowledgeDialogProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<KnowledgeFormValues>({
    resolver: zodResolver(knowledgeFormSchema),
    defaultValues: {
      title: "",
      category: "SOP",
      content_type: "YouTube",
      content: "",
      tags: "",
    },
  });

  const contentType = form.watch("content_type");

  // Reset form saat ditutup atau sukses
  useEffect(() => {
    if (!open) {
      form.reset({
        title: "",
        category: "SOP",
        content_type: "YouTube",
        content: "",
        tags: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (values: KnowledgeFormValues) => {
    setLoading(true);
    try {
      // Proses 'content' berdasarkan 'content_type'
      let finalContent = values.content;
      if (values.content_type === "YouTube") {
        // Konversi link YouTube biasa ke link embed
        // Cari video ID (handle watch?v= atau youtu.be/xxx)
        const match = values.content.match(/(?:v=|\/embed\/|\/youtu\.be\/)([^&"']+)/);
        const videoId = match ? match[1] : values.content.split('/').pop();

        if (videoId) {
           finalContent = `https://www.youtube.com/embed/${videoId}`;
        } else {
             throw new Error("URL YouTube tidak valid.");
        }
        
      } else if (values.content_type === "Google Drive") {
        // Konversi link Google Drive ke link embed (menggunakan /preview)
        finalContent = values.content.replace("/view", "/preview").replace("/edit", "/preview");
        if (!finalContent.includes('/preview')) {
             // Jika pengguna hanya memberikan ID atau link yang aneh
             const idMatch = finalContent.match(/\/d\/([^/]+)/);
             if(idMatch) {
                 finalContent = `https://docs.google.com/document/d/${idMatch[1]}/preview`;
             } else {
                 throw new Error("URL Google Drive tidak valid atau tidak memiliki format /view yang diharapkan. Pastikan izin share 'Anyone with the link'.");
             }
        }
      }
      
      // Proses 'tags' dari string "a, b, c" menjadi array ["a", "b", "c"]
      const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // Menyimpan tipe konten ke dalam tags (untuk di proses saat fetch/edit)
      // Ini adalah kunci untuk menentukan jenis embed saat render!
      const tagsWithTipe = [...tagsArray, `__type:${values.content_type}`];

      const { error } = await supabase
        .from("knowledge_base")
        .insert({
          title: values.title,
          category: values.category,
          content: finalContent, // Simpan URL embed atau teks
          tags: tagsWithTipe,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast.success("Materi baru berhasil ditambahkan.");
      onSuccess(); // Refresh list & tutup dialog
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
          <DialogTitle>Tambah Materi Baru</DialogTitle>
          <DialogDescription>
            Bagikan SOP, tutorial, atau kebijakan baru untuk tim.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        placeholder={contentType === 'YouTube' ? 'https://www.youtube.com/watch?v=...' : 'https://docs.google.com/document/d/.../view'} 
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
                    <Input placeholder="shopee, live, tips" {...field} />
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
                Simpan Materi
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};