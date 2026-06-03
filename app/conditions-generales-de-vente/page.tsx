import type { Metadata } from "next";
import { LegalLayout } from "@/app/components/ui/LegalLayout";
import { loadSettings } from "@/lib/content/settings.server";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description:
    "Conditions Générales de Vente du cabinet Mise en Mouvement — coaching sportif individuel, séances, cartes et accompagnement personnalisé.",
};

export const dynamic = "force-dynamic";

export default async function CGVPage() {
  const settings = await loadSettings();

  const email = settings.email;
  const phone = settings.phone.trim();
  const address = settings.address.trim();
  const postalCode = settings.postalCode.trim();
  const city = settings.city.trim();

  return (
    <LegalLayout
      eyebrow="Informations contractuelles"
      title="Conditions Générales de Vente"
    >
      <p>
        Dernière mise à jour : 1er juin 2026
      </p>
      <p>
        Les présentes Conditions Générales de Vente régissent les ventes de
        prestations proposées par le cabinet Mise en Mouvement, situé à
        Poussan, dans le cadre de séances de coaching sportif,
        d&apos;accompagnement au mouvement, de bilans, de suivis
        personnalisés et de prestations associées.
      </p>

      <h2>1. Prestataire</h2>
      <p>Les prestations sont proposées par Mise en Mouvement.</p>
      {(address || postalCode || city) && (
        <p>
          Adresse :{" "}
          {[address, [postalCode, city].filter(Boolean).join(" "), "France"]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
      )}
      {!address && !postalCode && !city && (
        <p>
          Adresse : 2 place du Marché, 34560 Poussan, France.
        </p>
      )}
      <p>
        Contact :{" "}
        <a href={`mailto:${email}`}>{email}</a>
        {phone ? ` — ${phone}` : null}.
      </p>

      <h2>2. Prestations proposées</h2>
      <p>Mise en Mouvement propose notamment :</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>des séances de coaching individuel ;</li>
        <li>des séances en duo ou trio ;</li>
        <li>des bilans mouvement ;</li>
        <li>des programmes personnalisés ;</li>
        <li>des cartes de plusieurs séances ;</li>
        <li>des suivis sportifs, posturaux ou de remise en mouvement.</li>
      </ul>
      <p>
        Les prestations sont réalisées sur rendez-vous, au cabinet ou selon
        les modalités précisées lors de la réservation.
      </p>

      <h2>3. Réservation</h2>
      <p>
        Les séances peuvent être réservées en ligne, par téléphone, par
        message ou directement auprès du cabinet.
      </p>
      <p>
        La réservation d&apos;une séance implique l&apos;acceptation des
        présentes Conditions Générales de Vente.
      </p>
      <p>
        Le cabinet se réserve le droit de refuser ou de reporter une séance
        si les conditions nécessaires à son bon déroulement ne sont pas
        réunies.
      </p>

      <h2>4. Tarifs</h2>
      <p>
        Les tarifs applicables sont ceux affichés sur le site ou communiqués
        au client au moment de la réservation.
      </p>
      <p>Les prix sont indiqués en euros, toutes taxes comprises lorsque cela est applicable.</p>
      <p>
        Mise en Mouvement se réserve le droit de modifier ses tarifs à tout
        moment. Toutefois, une prestation déjà réservée ou réglée reste
        facturée au tarif convenu lors de la réservation.
      </p>

      <h2>5. Paiement</h2>
      <p>
        Le paiement peut être effectué selon les moyens proposés par le
        cabinet, notamment par paiement en ligne, lien de paiement SumUp,
        carte bancaire, virement ou tout autre moyen accepté par Mise en
        Mouvement.
      </p>
      <p>
        Toute prestation ou carte de séances doit être réglée selon les
        conditions communiquées au client avant le début de
        l&apos;accompagnement.
      </p>

      <h2>6. Cartes de séances</h2>
      <p>
        Les cartes de séances sont nominatives et ne peuvent être cédées à un
        tiers sans accord préalable du cabinet.
      </p>
      <p>
        La durée de validité des cartes est précisée lors de l&apos;achat. À
        défaut de précision, la carte est valable pendant 6 mois à compter de
        la date d&apos;achat.
      </p>
      <p>
        Les séances non utilisées à l&apos;expiration de la période de
        validité ne sont ni remboursées ni reportées, sauf accord
        exceptionnel du cabinet.
      </p>

      <h2>7. Annulation et report</h2>
      <p>
        Toute annulation ou demande de report doit être effectuée au minimum
        24 heures avant l&apos;heure prévue de la séance.
      </p>
      <p>
        En cas d&apos;annulation tardive, d&apos;absence ou de
        non-présentation du client, la séance pourra être considérée comme
        due ou décomptée de la carte de séances.
      </p>
      <p>
        En cas d&apos;empêchement du coach, une nouvelle date sera proposée
        au client.
      </p>

      <h2>8. Retard</h2>
      <p>
        En cas de retard du client, la séance pourra être écourtée afin de
        ne pas impacter les rendez-vous suivants.
      </p>
      <p>La séance reste due dans son intégralité.</p>

      <h2>9. État de santé et responsabilité du client</h2>
      <p>
        Le client déclare être apte à pratiquer une activité physique
        adaptée.
      </p>
      <p>
        Il appartient au client d&apos;informer le coach de toute blessure,
        pathologie, douleur, traitement médical, grossesse, opération récente
        ou contre-indication connue.
      </p>
      <p>
        Mise en Mouvement pourra demander un avis médical ou refuser
        temporairement une séance si l&apos;état de santé du client semble
        incompatible avec la pratique proposée.
      </p>
      <p>
        Le client reste responsable des informations médicales qu&apos;il
        communique ou omet de communiquer.
      </p>

      <h2>10. Responsabilité du cabinet</h2>
      <p>
        Mise en Mouvement s&apos;engage à proposer un accompagnement
        sérieux, adapté et professionnel.
      </p>
      <p>
        Les prestations proposées ne remplacent pas un suivi médical,
        kinésithérapeutique ou thérapeutique lorsque celui-ci est nécessaire.
      </p>
      <p>
        Le cabinet ne peut être tenu responsable d&apos;un dommage résultant
        d&apos;une information incomplète ou inexacte transmise par le client
        concernant son état de santé.
      </p>

      <h2>11. Droit de rétractation</h2>
      <p>
        Conformément à la réglementation applicable, lorsqu&apos;une
        prestation est achetée à distance, le client peut bénéficier
        d&apos;un délai légal de rétractation de 14 jours.
      </p>
      <p>
        Toutefois, si le client demande expressément que la prestation
        commence avant la fin de ce délai, il reconnaît renoncer à son droit
        de rétractation pour la prestation déjà réalisée.
      </p>
      <p>Une séance déjà effectuée ne peut donner lieu à remboursement.</p>

      <h2>12. Remboursement</h2>
      <p>
        Les prestations réglées ne sont pas remboursables, sauf impossibilité
        majeure ou accord exceptionnel du cabinet.
      </p>
      <p>
        En cas d&apos;arrêt de l&apos;accompagnement à l&apos;initiative du
        client, les séances restantes ne donnent pas automatiquement droit à
        remboursement.
      </p>

      <h2>13. Données personnelles</h2>
      <p>
        Les informations collectées lors de la réservation ou du suivi client
        sont utilisées uniquement pour la gestion des rendez-vous, du suivi,
        de la facturation et de la relation client.
      </p>
      <p>
        Le client peut demander l&apos;accès, la modification ou la
        suppression de ses données personnelles en contactant le cabinet à
        l&apos;adresse{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>

      <h2>14. Propriété intellectuelle</h2>
      <p>
        Les documents, bilans, programmes, supports ou contenus transmis par
        Mise en Mouvement restent la propriété du cabinet.
      </p>
      <p>
        Ils sont destinés à un usage personnel uniquement et ne peuvent être
        copiés, diffusés, revendus ou transmis sans autorisation écrite
        préalable.
      </p>

      <h2>15. Litiges</h2>
      <p>
        En cas de difficulté, le client est invité à contacter Mise en
        Mouvement afin de rechercher une solution amiable.
      </p>
      <p>
        Les présentes Conditions Générales de Vente sont soumises au droit
        français.
      </p>

      <h2>16. Acceptation des CGV</h2>
      <p>
        Toute réservation, achat de séance, carte ou prestation implique
        l&apos;acceptation pleine et entière des présentes Conditions
        Générales de Vente.
      </p>
    </LegalLayout>
  );
}
