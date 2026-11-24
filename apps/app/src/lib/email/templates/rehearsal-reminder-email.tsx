import * as React from "react";
import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type RehearsalReminderEmailProps = {
  name?: string;
  churchName: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  songs?: string[];
  notes?: string;
  body?: string;
  rehearsalUrl?: string;
  churchLogo?: string | null;
  appLogoUrl?: string | null;
};

export function RehearsalReminderEmail({
  name,
  churchName,
  eventTitle,
  eventDate,
  eventTime,
  location,
  songs = [],
  notes,
  body,
  rehearsalUrl = "https://openministry.app/dashboard/rehearsals",
  churchLogo,
  appLogoUrl,
}: RehearsalReminderEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const message = notes || body;
  const musicList = songs.filter((song) => Boolean(song?.trim()));

  return (
    <BaseEmailLayout
      previewText={`Lembrete de ensaio: ${eventTitle} · ${churchName}`}
      churchName={churchName}
      churchLogo={churchLogo}
      appLogoUrl={appLogoUrl}
      footerText={`Lembrete automático de ensaio enviado para ${churchName}.`}
    >
      <Heading style={heading}>🎶 Lembrete de Ensaio</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Text style={paragraph}>
        Este é um lembrete do seu próximo ensaio na{" "}
        <strong>{churchName}</strong>. Confira os detalhes:
      </Text>

      <Section style={detailsCard}>
        <Text style={detailLabel}>Ensaio</Text>
        <Text style={detailValue}>{eventTitle}</Text>

        {eventDate ? (
          <>
            <Hr style={detailDivider} />
            <Text style={detailLabel}>Data</Text>
            <Text style={detailValue}>{eventDate}</Text>
          </>
        ) : null}

        {eventTime ? (
          <>
            <Hr style={detailDivider} />
            <Text style={detailLabel}>Horário</Text>
            <Text style={detailValue}>{eventTime}</Text>
          </>
        ) : null}

        {location ? (
          <>
            <Hr style={detailDivider} />
            <Text style={detailLabel}>Local</Text>
            <Text style={detailValue}>{location}</Text>
          </>
        ) : null}
      </Section>

      {musicList.length > 0 ? (
        <Section style={songsSection}>
          <Text style={songsTitle}>Repertório do ensaio</Text>
          {musicList.map((song, index) => (
            <Text
              key={`${song}-${index}`}
              style={
                index === musicList.length - 1
                  ? { ...songItem, borderBottom: "none" }
                  : songItem
              }
            >
              <span style={songNumber}>{`${index + 1}.`}</span> {song}
            </Text>
          ))}
        </Section>
      ) : null}

      {message ? (
        <Section style={notesCard}>
          <Text style={notesLabel}>Observações</Text>
          <Text style={notesText}>{message}</Text>
        </Section>
      ) : null}

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={rehearsalUrl}>
          Abrir ensaio no OpenMinistry
        </Button>
      </Section>
    </BaseEmailLayout>
  );
}

const heading = {
  fontSize: "22px",
  fontWeight: "700" as const,
  color: "#18181b",
  lineHeight: "28px",
  margin: "0 0 16px 0",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#3f3f46",
  margin: "0 0 16px 0",
};

const detailsCard = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px 24px",
  margin: "20px 0",
};

const detailLabel = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const detailValue = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: "#0f172a",
  lineHeight: "22px",
  margin: 0,
};

const detailDivider = {
  borderColor: "#e2e8f0",
  margin: "14px 0",
};

const songsSection = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px 24px 8px 24px",
  margin: "20px 0",
};

const songsTitle = {
  fontSize: "13px",
  fontWeight: "700" as const,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const songItem = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#0f172a",
  padding: "8px 0",
  margin: 0,
  borderBottom: "1px solid #f1f5f9",
};

const songNumber = {
  display: "inline-block",
  minWidth: "22px",
  fontWeight: "700" as const,
  color: "#2563eb",
};

const notesCard = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "20px 0",
};

const notesLabel = {
  fontSize: "12px",
  fontWeight: "700" as const,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 6px 0",
};

const notesText = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#334155",
  whiteSpace: "pre-wrap" as const,
  margin: 0,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "28px 0 20px 0",
};

const primaryButton = {
  backgroundColor: "#18181b",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "10px",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};
