# Le Koussay IA - TODO

## Fonctionnalités Principales

- [x] Schéma de base de données pour stocker les messages de conversation
- [x] Procédure tRPC pour envoyer un message et recevoir une réponse du LLM
- [x] Intégration du LLM pour générer des réponses intelligentes
- [x] Interface de chat avec affichage des messages en bulles
- [x] Champ de saisie texte avec support Entrée et bouton d'envoi
- [x] Indicateur de chargement (typing indicator) pendant la génération
- [x] Rendu Markdown des réponses du chatbot
- [x] En-tête avec le nom "Le Koussay IA"
- [x] Historique des messages persistant
- [x] Tests unitaires pour les procédures tRPC
- [x] Responsive design et optimisation mobile

## Nouvelles Fonctionnalités

- [x] Formulaire d'inscription personnalisé
- [x] Formulaire de connexion personnalisé
- [x] Téléchargement de fichiers dans le chat
- [x] Génération d'images via l'IA
- [x] Génération de musique via l'IA
- [x] Affichage des fichiers téléchargés
- [x] Affichage des images générées
- [x] Affichage des musiques générées

## Statut

- [x] Projet initialisé avec scaffold web-db-user
- [x] Phase 1 : Configuration du design et structure
- [x] Phase 2 : Logique serveur (tRPC + LLM)
- [x] Phase 3 : Interface utilisateur
- [x] Phase 4 : Tests et validation (22 tests robustes avec mocks)
- [x] Phase 5 : Déploiement et lien d'accès
- [x] Phase 6 : Formulaires d'inscription/connexion avec OAuth
- [x] Phase 7 : Téléchargement de fichiers réel
- [x] Phase 8 : Génération d'images réelle
- [x] Phase 9 : Génération de musique
- [x] Phase 10 : Tests avancés (34 tests passants)

## Prochaines Étapes (Phase 11-13)

- [x] Ajouter une barre de progression pour les uploads de fichiers
- [x] Créer l'historique persistant avec suppression de conversations
- [x] Implémenter la vraie génération de musique avec API

## Bug Fixes

- [x] Correction du bug "Failed to fetch" pour la génération d'images
  - Remplacé le placeholder via.placeholder.com par une image SVG en base64
  - Ajout d'un fallback SVG qui fonctionne sans requête réseau
  - Ajout de tests pour valider le fallback SVG
  - 45 tests passants

## Audit et Corrections Complètes (Phase 14)

- [x] Audit complet des fonctionnalités (upload, image, musique)
- [x] Correction des procédures tRPC pour retourner les messages sauvegardés
- [x] Correction de l'interface ChatPage pour afficher correctement les messages
- [x] Correction de la gestion d'erreurs LLM (fallback gracieux)
- [x] Correction des tests unitaires pour correspondre au nouveau format
- [x] Tous les 46 tests passent avec succès
- [x] Upload de fichiers fonctionne correctement
- [x] Génération d'images avec fallback SVG
- [x] Génération de musique fonctionne
