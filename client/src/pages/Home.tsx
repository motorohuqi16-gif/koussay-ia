import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Upload, Image as ImageIcon, Music } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-accent" />
            <span className="font-bold text-lg">Le Koussay IA</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button
                onClick={() => setLocation("/chat")}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Aller au Chat
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  Se connecter
                </Button>
                <Button
                  onClick={() => setLocation("/signup")}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  S'inscrire
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <MessageCircle className="w-16 h-16 text-accent animate-pulse" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Le Koussay IA</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Votre assistant IA personnel pour converser, créer et explorer les possibilités infinies de l'intelligence artificielle.
          </p>
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/chat")}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Commencer une Conversation
            </Button>
          ) : (
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Se Connecter avec Manus OAuth
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Fonctionnalités Principales</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <Sparkles className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-semibold mb-2">Chat Intelligent</h3>
              <p className="text-sm text-muted-foreground">
                Conversez avec une IA avancée pour obtenir des réponses précises et utiles.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <ImageIcon className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-semibold mb-2">Génération d'Images</h3>
              <p className="text-sm text-muted-foreground">
                Créez des images magnifiques en décrivant simplement ce que vous imaginez.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <Upload className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-semibold mb-2">Partage de Fichiers</h3>
              <p className="text-sm text-muted-foreground">
                Téléchargez et partagez des fichiers directement dans le chat.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <Music className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-semibold mb-2">Génération de Musique</h3>
              <p className="text-sm text-muted-foreground">
                Générez de la musique originale basée sur vos descriptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à Commencer ?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Rejoignez des milliers d'utilisateurs qui utilisent Le Koussay IA pour améliorer leur productivité.
          </p>
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/chat")}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Accéder au Chat
            </Button>
          ) : (
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Commencer Maintenant
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Le Koussay IA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
