import { createFileRoute } from "@tanstack/react-router";
import { BitChatView } from "@/components/kovcheg/bitchat-view";
import { TacticalSecurityGate } from "@/components/kovcheg/tactical-security-gate";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function ChatPage() {
  return (
    <main>
      <TacticalSecurityGate moduleName="Радиоэфир и Mesh-связь (BitChat)">
        <BitChatView />
      </TacticalSecurityGate>
    </main>
  );
}
