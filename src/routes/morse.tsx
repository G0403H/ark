import { createFileRoute } from "@tanstack/react-router";
import { MorseTransceiver } from "@/components/kovcheg/morse-transceiver";

export const Route = createFileRoute("/morse")({ component: MorsePage });

function MorsePage() {
  return <MorseTransceiver />;
}
