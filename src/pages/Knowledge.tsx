import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, BookOpen, Video, FileText, Link as LinkIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddKnowledgeDialog } from "@/components/Knowledge/AddKnowledgeDialog";
import { cn } from "@/lib/utils";

// Tipe data dari Supabase
type KnowledgeData = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
};

// Tipe data yang sudah diproses
type ProcessedKnowledgeData = Omit<KnowledgeData, 'tags'> & {
  type: "YouTube" | "Google Drive" | "Teks";
  tags: string[];
};

// Helper untuk render konten
const RenderContent = ({ item }: { item: ProcessedKnowledgeData }) => {
  if (item.type === "YouTube" || item.type === "Google Drive") {
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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          profiles ( full_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Proses data (Ekstrak 'type' dari tags)
      const processedData: ProcessedKnowledgeData[] = (data as KnowledgeData[]).map(item => {
        let type: ProcessedKnowledgeData["type"] = "Teks"; // Default
        const tags = item.tags || [];
        
        const typeTag = tags.find(t => t.startsWith("__type:"));
        if (typeTag) {
          type = typeTag.split(":")[1] as ProcessedKnowledgeData["type"];
        }
        
        return {
          ...item,
          type: type,
          tags: tags.filter(t => !t.startsWith("__type:")), // Tags bersih
        };
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SOP & Knowledge Center</h1>
            <p className="text-muted-foreground">Pusat tutorial, SOP, dan kebijakan perusahaan.</p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
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
                      <AccordionTrigger className="text-xl font-semibold">
                        {category} ({items.length})
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {items.map(item => (
                          <Card key={item.id} className="overflow-hidden">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                {item.type === 'YouTube' && <Video className="h-5 w-5 text-destructive" />}
                                {item.type === 'Google Drive' && <LinkIcon className="h-5 w-5 text-blue-500" />}
                                {item.type === 'Teks' && <FileText className="h-5 w-5 text-muted-foreground" />}
                                {item.title}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                Dibuat oleh {item.profiles?.full_name || 'Sistem'} pada {format(new Date(item.created_at), "dd MMM yyyy")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <RenderContent item={item} />
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

      {/* Render Dialog */}
      {canManage && (
         <AddKnowledgeDialog
           open={isModalOpen}
           onOpenChange={setIsModalOpen}
           onSuccess={() => {
             setIsModalOpen(false); // Tutup dialog
             fetchData(); // Refresh data
           }}
         />
       )}
    </MainLayout>
  );
};

export default Knowledge;