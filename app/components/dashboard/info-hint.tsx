import { Info } from "lucide-react";

/**
 * Icono de info con tooltip nativo del navegador (title). Pensado para
 * términos que un dueño de discoteca nuevo en el panel puede no conocer
 * (cohorte, LTV, tiers de referidos...) sin saturar la UI con texto extra.
 */
export function InfoHint({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex shrink-0 cursor-help">
      <Info
        size={12}
        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label={text}
      />
    </span>
  );
}
