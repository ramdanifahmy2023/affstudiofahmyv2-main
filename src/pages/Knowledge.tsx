// src/pages/Knowledge.tsx

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Loader2, 
  BookOpen, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  MoreHorizontal, 
  Pencil, 
  Trash2 
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu"; 
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddKnowledgeDialog } from "@/components/Knowledge/AddKnowledgeDialog";
import { EditKnowledgeDialog } from "@/components/Knowledge/EditKnowledgeDialog"; 
import { DeleteKnowledgeAlert } from "@/components/Knowledge/DeleteKnowledgeAlert"; 
import { cn } from "@/lib/utils";

// Tipe data dari Supabase
type KnowledgeData = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  created_at: string;
  created_by: string | null; 
  profiles: {
    full_name: string;
  } | null;
};

// Tipe data yang sudah diproses
export type ProcessedKnowledgeData = Omit<KnowledgeData, 'tags'> & {
  type: "YouTube" | "Google Drive" | "Teks";
  tags: string[];
};

// Tipe untuk dialog
type DialogState = {
  add: boolean;
  edit: ProcessedKnowledgeData | null;
  delete: ProcessedKnowledgeData | null;
};

// Helper untuk render konten
const RenderContent = ({ item, isExpanded }: { item: ProcessedKnowledgeData, isExpanded: boolean }) => {
  if (item.type === "YouTube" && isExpanded) {
    return (
      <div className="aspect-video w-full">
        <iframe
          src={item.content}
          title={item.title}
          className="w-full h-full rounded-md border"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }
  
  if (item.type === "Google Drive" || (item.type === "YouTube" && !isExpanded)) {
      return (
         <a href={item.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2">
             <LinkIcon className="h-4 w-4" />
             Lihat {item.type}
         </a>
      );
  }
  
  if (item.type === "Teks") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-muted/50">
        <p>{item.content}</p> 
        {/* TODO: Ganti <p> dengan parser Markdown jika ingin lebih canggih */}
      </div>
    );
  }

  return <p className="text-muted-foreground">Tipe konten tidak dikenali.</p>;
};

const Knowledge = () => {
  const { profile } = useAuth();
  const [knowledgeBase, setKnowledgeBase] = useState<ProcessedKnowledgeData[]>([]);
  const [groupedKnowledge, setGroupedKnowledge] = useState<Record<string, ProcessedKnowledgeData[]>>({});
  const [loading, setLoading] = useState(true);
  
  // State untuk Dialogs
  const [dialogs, setDialogs] = useState<DialogState>({
    add: false,
    edit: null,
    delete: null,
  });
  const [expandedItem, setExpandedItem] = useState<string | null>(null); 

  // Cek hak akses
  const canManage = profile?.role === "superadmin";

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select(`
          id,
          title,
          content,
          category,
          tags,
          created_at,
          created_by,
          profiles ( full_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Proses data (Ekstrak 'type' dari tags)
      const processedData: ProcessedKnowledgeData[] = (data as KnowledgeData[]).map(item => {
        let type: ProcessedKnowledgeData["type"] = "Teks"; 
        const tags = item.tags || [];
        
        const typeTag = tags.find(t => t.startsWith("__type:"));
        if (typeTag) {
          type = typeTag.split(":")[1] as ProcessedKnowledgeData["type"];
        }
        
        return {
          ...item,
          type: type,
          tags: tags.filter(t => !t.startsWith("__type:")), // Tags bersih
        } as ProcessedKnowledgeData;
      });
      
      setKnowledgeBase(processedData);
      
      // Kelompokkan data berdasarkan kategori
      const groups: Record<string, ProcessedKnowledgeData[]> = {};
      for (const item of processedData) {
        const category = item.category || "Lainnya";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(item);
      }
      setGroupedKnowledge(groups);

    } catch (error: any) {
      toast.error("Gagal memuat materi SOP.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);
  
  const handleEditClick = (item: ProcessedKnowledgeData) => {
    setDialogs({ ...dialogs, edit: item });
  };
  
  const handleDeleteClick = (item: ProcessedKnowledgeData) => {
    setDialogs({ ...dialogs, delete: item });
  };
  
  const handleSuccess = () => {
     setDialogs({ add: false, edit: null, delete: null });
     fetchData(); // Refresh data
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SOP & Knowledge Center</h1>
            <p className="text-muted-foreground">Pusat tutorial, SOP, dan kebijakan perusahaan.</p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setDialogs({ ...dialogs, add: true })}>
              <Plus className="h-4 w-4" />
              Tambah Materi Baru
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedKnowledge).length === 0 ? (
               <Card>
                 <CardContent className="pt-6 text-center text-muted-foreground">
                   Belum ada materi SOP atau tutorial yang ditambahkan.
                 </CardContent>
               </Card>
            ) : (
                <Accordion type="single" collapsible defaultValue={Object.keys(groupedKnowledge)[0]}>
                  {Object.entries(groupedKnowledge).map(([category, items]) => (
                    <AccordionItem value={category} key={category}>
                      <AccordionTrigger 
                         className="text-xl font-semibold"
                         // Toggle state expanded untuk mengontrol RenderContent
                         onClick={() => setExpandedItem(expandedItem === category ? null : category)}
                      >
                        {category} ({items.length})
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {items.map(item => (
                          <Card key={item.id} className="overflow-hidden">
                            <CardHeader className="relative">
                              <CardTitle className="flex items-center gap-2">
                                {item.type === 'YouTube' && <Video className="h-5 w-5 text-destructive" />}
                                {item.type === 'Google Drive' && <LinkIcon className="h-5 w-5 text-blue-500" />}
                                {item.type === 'Teks' && <FileText className="h-5 w-5 text-muted-foreground" />}
                                {item.title}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                Dibuat oleh {item.profiles?.full_name || 'Sistem'} pada {format(new Date(item.created_at), "dd MMM yyyy")}
                              </CardDescription>
                              {canManage && (
                                <div className="absolute right-4 top-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Materi
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleDeleteClick(item)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus Materi
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </CardHeader>
                            <CardContent>
                              {/* Kirim status expanded */}
                              <RenderContent item={item} isExpanded={expandedItem === category} />
                              <div className="flex gap-2 mt-4">
                                {item.tags.map(tag => (
                                  <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
            )}
          </div>
        )}
      </div>

      {/* Render Dialogs */}
      {canManage && (
         <>
           {/* Dialog Tambah */}
           <AddKnowledgeDialog
             open={dialogs.add}
             onOpenChange={(open) => setDialogs({ ...dialogs, add: open })}
             onSuccess={handleSuccess}
           />
           
           {/* Dialog Edit */}
           <EditKnowledgeDialog
             open={!!dialogs.edit}
             onOpenChange={(open) => setDialogs({ ...dialogs, edit: open ? dialogs.edit : null })}
             onSuccess={handleSuccess}
             knowledgeToEdit={dialogs.edit}
           />
           
           {/* Alert Hapus */}
           <DeleteKnowledgeAlert
             open={!!dialogs.delete}
             onOpenChange={(open) => setDialogs({ ...dialogs, delete: open ? dialogs.delete : null })}
             onSuccess={handleSuccess}
             knowledgeToDelete={dialogs.delete}
           />
         </>
       )}
    </MainLayout>
  );
};

export default Knowledge;