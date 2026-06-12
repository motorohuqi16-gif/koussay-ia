import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMessage, getConversationHistory, deleteMessage, deleteAllConversations } from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { generateMusic } from "./_core/musicGeneration";
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    // Get conversation history for the current user
    history: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        const history = await getConversationHistory(ctx.user.id, input.limit);
        return history;
      }),

    // Send a message and get AI response
    sendMessage: protectedProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Save user message
          const userMsg = await createMessage(ctx.user.id, 'user', input.message);
          if (!userMsg) throw new Error('Failed to save user message');

          // Get conversation history for context (includes the message we just saved)
          const history = await getConversationHistory(ctx.user.id, 20);
          
          // Build messages for LLM
          const llmMessages = [
            {
              role: 'system' as const,
              content: 'Tu es Le Koussay IA, un assistant IA intelligent, amical et utile. Tu réponds toujours en français avec clarté et précision. Tu es conçu pour aider les utilisateurs avec diverses questions et tâches. Sois concis mais informatif, et utilise le Markdown pour formater tes réponses quand c\'est approprié.',
            },
            ...history.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            })),
          ];

          // Get AI response
          let assistantContent = 'Je n\'ai pas pu générer une réponse.';
          try {
            const response = await invokeLLM({ messages: llmMessages });
            const rawContent = response.choices?.[0]?.message?.content || assistantContent;
            assistantContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
          } catch (llmError) {
            console.error('[LLM Error]', llmError);
            // Use fallback content if LLM fails
            assistantContent = 'Désolé, une erreur s\'est produite lors de la génération de la réponse. Veuillez réessayer.';
          }

          // Save assistant message
          const assistantMsg = await createMessage(ctx.user.id, 'assistant', assistantContent);
          if (!assistantMsg) throw new Error('Failed to save assistant message');

          return {
            userMessage: userMsg,
            assistantMessage: assistantMsg,
            response: assistantContent,
          };
        } catch (error) {
          console.error('[Chat Error]', error);
          throw new Error('Failed to send message');
        }
      }),

    // Generate an image based on a prompt
    generateImage: protectedProcedure
      .input(z.object({ prompt: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const imageData = await generateImage({ prompt: input.prompt });
          const message = `![Generated Image](${imageData.url})`;
          
          // Save the image generation as an assistant message and return it
          const savedMessage = await createMessage(ctx.user.id, 'assistant', message);
          if (!savedMessage) throw new Error('Failed to save image message');
          
          return { 
            success: true, 
            url: imageData.url,
            message: savedMessage,
          };
        } catch (error) {
          console.error('[Image Generation Error]', error);
          throw new Error('Failed to generate image');
        }
      }),

    // Upload a file
    uploadFile: protectedProcedure
      .input(z.object({ 
        filename: z.string().min(1),
        fileData: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Convert base64 to buffer
          const buffer = Buffer.from(input.fileData, 'base64');
          
          // Upload to storage
          const fileKey = `chat-files/${ctx.user.id}/${Date.now()}-${input.filename}`;
          const { url, key } = await storagePut(fileKey, buffer, input.mimeType);
          
          // Save file reference as a message and return it
          const messageContent = `📎 [${input.filename}](${url})`;
          const savedMessage = await createMessage(ctx.user.id, 'assistant', messageContent);
          if (!savedMessage) throw new Error('Failed to save file message');
          
          return { 
            success: true, 
            url,
            key,
            message: savedMessage,
          };
        } catch (error) {
          console.error('[File Upload Error]', error);
          throw new Error('Failed to upload file');
        }
      }),

    // Generate music based on a prompt
    generateMusic: protectedProcedure
      .input(z.object({ prompt: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await generateMusic({ prompt: input.prompt });
          
          // Save the music generation request as an assistant message and return it
          const savedMessage = await createMessage(ctx.user.id, 'assistant', result.message);
          if (!savedMessage) throw new Error('Failed to save music message');
          
          return { 
            success: result.status !== 'error', 
            message: savedMessage,
            url: result.url,
            status: result.status
          };
        } catch (error) {
          console.error('[Music Generation Error]', error);
          throw new Error('Failed to generate music');
        }
      }),

    // Delete a specific message
    deleteMessage: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await deleteMessage(ctx.user.id, input.messageId);
        return { success };
      }),

    // Delete all conversations for the current user
    deleteAllConversations: protectedProcedure
      .mutation(async ({ ctx }) => {
        const success = await deleteAllConversations(ctx.user.id);
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
