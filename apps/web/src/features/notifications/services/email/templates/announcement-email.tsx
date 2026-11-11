import * as React from "react";
import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type AnnouncementEmailProps = {
  name?: string;
  churchName: string;
  title: string;
  body: string;
  authorName?: string;
  announcementUrl?: string;
};

export function AnnouncementEmail({
  name,
  churchName,
  title,
  body,
  authorName,
  announcementUrl = "https://openministry.app/dashboard/notifications",
}: AnnouncementEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return (
    <BaseEmailLayout
      previewText={`${title} · ${churchName}`}
      churchName={churchName}
      footerText={`Comunicado oficial da igreja ${churchName}.`}
    >
      <Heading style={heading}>📢 Comunicado da Igreja</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Section style={announcementCard}>
        <Text style={announcementTitle}>{title}</Text>
        <Hr style={cardDivider} />
        <Text style={announcementBody}>{body}</Text>

        {authorName ? (
          <Text style={authorTag}>
            Publicado por <strong>{authorName}</strong>
          </Text>
        ) : null}
      </Section>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={announcementUrl}>
          Abrir no OpenMinistry
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

const announcementCard = {
  backgroundColor: "#fdfefe",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "24px",
  margin: "20px 0",
};

const announcementTitle = {
  fontSize: "18px",
  fontWeight: "700" as const,
  color: "#0f172a",
  margin: "0 0 12px 0",
  lineHeight: "24px",
};

const cardDivider = {
  borderColor: "#f1f5f9",
  margin: "12px 0 16px 0",
};

const announcementBody = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#334155",
  whiteSpace: "pre-wrap" as const,
  margin: 0,
};

const authorTag = {
  fontSize: "12px",
  color: "#64748b",
  margin: "16px 0 0 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 16px 0",
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
