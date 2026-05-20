import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createMessage, getConversationHistory } from "./db";
import { invokeLLM } from "./_core/llm";

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

          // Get AI response with error handling
          let aiContent = '';
          try {
            const response = await invokeLLM({
              messages: llmMessages,
            });
            const aiContentRaw = response.choices[0]?.message?.content;
            aiContent = typeof aiContentRaw === 'string' ? aiContentRaw : '';
          } catch (llmError) {
            console.error('[LLM Error]', llmError);
            aiContent = 'Désolé, une erreur s\'est produite lors de la génération de la réponse. Veuillez réessayer.';
          }
          
          // Save AI response
          const aiMsg = await createMessage(ctx.user.id, 'assistant', aiContent);
          if (!aiMsg) throw new Error('Failed to save AI message');

          return {
            userMessage: userMsg,
            aiMessage: aiMsg,
          };
        } catch (error) {
          console.error('[Chat Error]', error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
