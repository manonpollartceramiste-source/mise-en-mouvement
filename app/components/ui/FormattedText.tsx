import { Fragment } from "react";

type FormattedTextProps = {
  text: string;
  /** Classes appliquées à tous les paragraphes (couleur, taille, font, max-width…). */
  className?: string;
  /** Classe de marge du premier paragraphe. Ex : "mt-5". */
  topGap?: string;
  /**
   * Classe de marge ajoutée aux paragraphes 2 et suivants.
   * Default "mt-4" — crée un espacement typographique entre paragraphes.
   */
  paraGap?: string;
};

/**
 * Affiche un texte saisi dans l'admin en respectant les sauts de ligne.
 *
 * - Ligne vide (\n\n) → paragraphes distincts espacés par `paraGap`
 * - Retour à la ligne simple (\n) → <br /> au sein du même paragraphe
 *
 * Sans dangerouslySetInnerHTML — aucune injection HTML possible.
 */
export function FormattedText({
  text,
  className = "",
  topGap = "",
  paraGap = "mt-4",
}: FormattedTextProps) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((para, i) => {
        const gap = i === 0 ? topGap : paraGap;
        const lines = para.split("\n");
        const cls = [gap, className].filter(Boolean).join(" ");
        return (
          <p key={i} className={cls || undefined}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
