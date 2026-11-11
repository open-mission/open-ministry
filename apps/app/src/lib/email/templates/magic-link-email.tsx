import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type MagicLinkEmailProps = {
  name?: string;
  magicLinkUrl: string;
};

export function MagicLinkEmail({ name, magicLinkUrl }: MagicLinkEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return (
    <BaseEmailLayout
      previewText="Seu link mágico de acesso ao OpenMinistry"
      footerText="Se você não solicitou este link de acesso, pode ignorar esta mensagem com total segurança."
    >
      <Heading style={heading}>Acesso sem Senha ✨</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Text style={paragraph}>
        Clique no botão abaixo para entrar instantaneamente na sua conta do
        OpenMinistry, sem precisar digitar sua senha:
      </Text>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={magicLinkUrl}>
          Entrar no OpenMinistry
        </Button>
      </Section>

      <Section style={infoBox}>
        <Text style={infoText}>
          🔒 Este link é de uso único e expira rapidamente por motivos de
          segurança. Não o compartilhe com ninguém.
        </Text>
      </Section>

      <Text style={subtleText}>
        Se o botão não funcionar, utilize o link direto:
      </Text>
      <Text style={linkText}>{magicLinkUrl}</Text>
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

const buttonContainer = {
  textAlign: "center" as const,
  margin: "28px 0 24px 0",
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

const infoBox = {
  backgroundColor: "#f4f4f5",
  borderLeft: "4px solid #71717a",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "20px 0",
};

const infoText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#52525b",
  margin: 0,
};

const subtleText = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#71717a",
  margin: "20px 0 6px 0",
};

const linkText = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#2563eb",
  wordBreak: "break-all" as const,
  margin: 0,
};
