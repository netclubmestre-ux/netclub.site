import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat — NetClub" },
      { name: "description", content: "Mensagens privadas no NetClub." },
      { property: "og:title", content: "Chat — NetClub" },
      { property: "og:description", content: "Mensagens privadas no NetClub." },
    ],
  }),
  component: () => (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-deep">
        <MessageCircle className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-5 text-2xl font-bold">Chat privado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Em breve você poderá conversar com suas conexões por aqui.
      </p>
    </div>
  ),
});
