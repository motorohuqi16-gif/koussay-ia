import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Paperclip, Image, Music } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Array<{ id: number; role: 'user' | 'assistant'; content: string; createdAt: Date }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
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
          id: data.aiMessage.id,
          role: 'assistant',
          content: data.aiMessage.content,
          createdAt: new Date(data.aiMessage.createdAt),
        },
      ]);
      setInputValue("");
      setIsLoading(false);
      inputRef.current?.focus();
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
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
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `![Image generee](${data.url})`,
        createdAt: new Date(),
      }]);
      setGeneratingImage(false);
    },
    onError: (error) => {
      console.error('Image generation failed:', error);
      toast.error('Erreur lors de la generation de l\'image');
      setGeneratingImage(false);
    },
  });

  const uploadFileMutation = trpc.chat.uploadFile.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `[Fichier telecharge: ${data.filename}](${data.url})`,
        createdAt: new Date(),
      }]);
      setUploadedFiles([]);
    },
    onError: (error) => {
      console.error('File upload failed:', error);
      toast.error('Erreur lors du telechargemnt du fichier');
    },
  });

  const generateMusicMutation = trpc.chat.generateMusic.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: data.message,
        createdAt: new Date(),
      }]);
      setGeneratingMusic(false);
    },
    onError: (error) => {
      console.error('Music generation failed:', error);
      toast.error('Erreur lors de la generation de musique');
      setGeneratingMusic(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const base64Data = fileData.split(',')[1] || fileData;
        await uploadFileMutation.mutateAsync({
          filename: file.name,
          fileData: base64Data,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!inputValue.trim()) return;
    setGeneratingImage(true);
    await generateImageMutation.mutateAsync({ prompt: inputValue });
  };

  const handleGenerateMusic = async () => {
    if (!inputValue.trim()) return;
    setGeneratingMusic(true);
    await generateMusicMutation.mutateAsync({ prompt: inputValue });
  };

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
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="bg-secondary text-sm px-3 py-1 rounded-full flex items-center gap-2">
                  <Paperclip className="w-3 h-3" />
                  {file.name}
                </div>
              ))}
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
              disabled={isLoading}
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
              className="bg-secondary hover:bg-secondary/80 text-foreground px-3"
              title="Telecharger un fichier"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              onClick={handleGenerateImage}
              disabled={generatingImage || !inputValue.trim()}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-3"
              title="Generer une image"
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
              disabled={generatingMusic || !inputValue.trim()}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-3"
              title="Generer de la musique"
            >
              {generatingMusic ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Music className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
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
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Le Koussay IA • Powered by Advanced AI
          </p>
        </div>
      </div>
    </div>
  );
}
