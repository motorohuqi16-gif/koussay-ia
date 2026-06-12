import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Paperclip, Image, Music, Trash2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Array<{ id: number; role: 'user' | 'assistant'; content: string; createdAt: Date }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversation history on mount
  const { data: historyData } = trpc.chat.history.useQuery(
    { limit: 50 },
    { enabled: !!user && !authLoading }
  );

  useEffect(() => {
    if (historyData) {
      setMessages(historyData.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })));
    }
  }, [historyData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          id: data.userMessage.id,
          role: 'user',
          content: data.userMessage.content,
          createdAt: new Date(data.userMessage.createdAt),
        },
        {
          id: data.assistantMessage.id,
          role: 'assistant',
          content: data.assistantMessage.content,
          createdAt: new Date(data.assistantMessage.createdAt),
        },
      ]);
      setInputValue("");
      setIsLoading(false);
      inputRef.current?.focus();
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("Erreur lors de l'envoi du message");
      setIsLoading(false);
    },
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    await sendMessageMutation.mutateAsync({ message: inputValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateImageMutation = trpc.chat.generateImage.useMutation({
    onSuccess: (data) => {
      if (data.message) {
        setMessages(prev => [...prev, {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          createdAt: new Date(data.message.createdAt),
        }]);
        toast.success('Image générée avec succès');
      } else {
        toast.error('La génération d\'image a échoué.');
      }
      setGeneratingImage(false);
      setInputValue("");
    },
    onError: (error: any) => {
      console.error('Image generation failed:', error);
      const errorMsg = error?.message || 'Erreur lors de la génération de l\'image';
      toast.error(errorMsg);
      setGeneratingImage(false);
    },
  });

  const uploadFileMutation = trpc.chat.uploadFile.useMutation({
    onSuccess: (data) => {
      if (data.message) {
        setMessages(prev => [...prev, {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          createdAt: new Date(data.message.createdAt),
        }]);
        toast.success('Fichier téléchargé avec succès');
      } else {
        toast.error('L\'upload du fichier a échoué.');
      }
    },
    onError: (error: any) => {
      console.error('File upload failed:', error);
      const errorMsg = error?.message || 'Erreur lors du téléchargement du fichier';
      toast.error(errorMsg);
    },
  });

  const generateMusicMutation = trpc.chat.generateMusic.useMutation({
    onSuccess: (data) => {
      if (data.message) {
        setMessages(prev => [...prev, {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          createdAt: new Date(data.message.createdAt),
        }]);
        toast.success('Musique générée avec succès');
      } else {
        toast.error('La génération de musique a échoué.');
      }
      setGeneratingMusic(false);
      setInputValue("");
    },
    onError: (error: any) => {
      console.error('Music generation failed:', error);
      const errorMsg = error?.message || 'Erreur lors de la génération de musique';
      toast.error(errorMsg);
      setGeneratingMusic(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Le fichier ${file.name} est trop volumineux (max 10MB)`);
        continue;
      }

      setIsUploading(true);
      setUploadProgress(0);

      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      reader.onload = async (event) => {
        try {
          setUploadProgress(90);
          const fileData = event.target?.result as string;
          const base64Data = fileData.split(',')[1] || fileData;
          const asciiFilename = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 255);
          await uploadFileMutation.mutateAsync({
            filename: asciiFilename,
            fileData: base64Data,
            mimeType: file.type,
          });
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 500);
        } catch (error) {
          console.error('File upload error:', error);
          setIsUploading(false);
          setUploadProgress(0);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    e.currentTarget.value = '';
  };

  const handleGenerateImage = async () => {
    if (!inputValue.trim()) {
      toast.error('Veuillez entrer une description pour générer une image');
      return;
    }
    setGeneratingImage(true);
    await generateImageMutation.mutateAsync({ prompt: inputValue });
  };

  const handleGenerateMusic = async () => {
    if (!inputValue.trim()) {
      toast.error('Veuillez entrer une description pour générer de la musique');
      return;
    }
    setGeneratingMusic(true);
    await generateMusicMutation.mutateAsync({ prompt: inputValue });
  };

  const deleteMessageMutation = trpc.chat.deleteMessage.useMutation({
    onSuccess: () => {
      setMessages(prev => prev.filter(m => m.id !== showDeleteConfirm));
      setShowDeleteConfirm(null);
      toast.success('Message supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
      setShowDeleteConfirm(null);
    },
  });

  const deleteAllMutation = trpc.chat.deleteAllConversations.useMutation({
    onSuccess: () => {
      setMessages([]);
      toast.success('Historique supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner className="w-8 h-8 text-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <div className="p-4 bg-secondary rounded-full mb-4 inline-block">
            <MessageCircle className="w-12 h-12 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Le Koussay IA</h1>
          <p className="text-muted-foreground mb-6">
            Connectez-vous pour commencer à converser avec votre assistant IA personnel.
          </p>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-accent rounded-lg">
            <MessageCircle className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Le Koussay IA</h1>
            <p className="text-sm text-muted-foreground">Assistant IA intelligent et conversationnel</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="p-4 bg-secondary rounded-full mb-4">
                <MessageCircle className="w-12 h-12 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Bienvenue sur Le Koussay IA</h2>
              <p className="text-muted-foreground max-w-md">
                Posez-moi vos questions et je vous aiderai avec des réponses précises et utiles.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 group ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-accent text-accent-foreground rounded-br-none"
                      : "bg-card text-card-foreground border border-border rounded-bl-none"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive"
                  title="Supprimer ce message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card text-card-foreground border border-border px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-2">
                <Spinner className="w-4 h-4 text-accent" />
                <span className="text-sm text-muted-foreground">Le Koussay IA est en train de répondre...</span>
              </div>
            </div>
          )}
          {showDeleteConfirm !== null && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Supprimer ce message ?</h3>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="bg-secondary hover:bg-secondary/80 text-foreground"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => deleteMessageMutation.mutate({ messageId: showDeleteConfirm })}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {isUploading && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Téléchargement en cours...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Écrivez votre message... (Appuyez sur Entrée pour envoyer)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || generatingImage || generatingMusic || isUploading}
              className="flex-1 bg-input text-foreground placeholder:text-muted-foreground border border-border rounded-md focus:ring-2 focus:ring-accent focus:outline-none px-3 py-2"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || generatingImage || generatingMusic || isUploading}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-3"
              title="Télécharger un fichier"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              onClick={handleGenerateImage}
              disabled={generatingImage || !inputValue.trim() || isLoading || isUploading}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-3"
              title="Générer une image"
            >
              {generatingImage ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Image className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              onClick={handleGenerateMusic}
              disabled={generatingMusic || !inputValue.trim() || isLoading || isUploading}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-3"
              title="Générer de la musique"
            >
              {generatingMusic ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Music className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim() || generatingImage || generatingMusic || isUploading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 gap-2"
            >
              {isLoading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Envoyer</span>
            </Button>
          </form>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground text-center flex-1">
              Le Koussay IA • Powered by Advanced AI
            </p>
            {messages.length > 0 && (
              <Button
                type="button"
                onClick={() => {
                  if (confirm('Supprimer tout l\'historique ?')) {
                    deleteAllMutation.mutate();
                  }
                }}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-1 text-xs"
                title="Supprimer tout l'historique"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
