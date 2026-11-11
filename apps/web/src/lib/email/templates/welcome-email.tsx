import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type WelcomeEmailProps = {
  name: string;
  churchName?: string;
  dashboardUrl?: string;
};

export function WelcomeEmail({
  name,
  churchName,
  dashboardUrl = "https://openministry.app/dashboard",
}: WelcomeEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return (
    <BaseEmailLayout
      previewText={`Seja bem-vindo(a) ao OpenMinistry${churchName ? ` · ${churchName}` : ""}`}
      churchName={churchName}
    >
      <Heading style={heading}>Bem-vindo ao OpenMinistry 👋</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Text style={paragraph}>
        Sua conta foi criada com sucesso! A partir de agora, você tem acesso ao
        painel completo para acompanhar suas escalas de voluntariado, avisos da
        comunidade, eventos e a rotina dos seus ministérios.
      </Text>

      {churchName ? (
        <Section style={highlightBox}>
          <Text style={highlightLabel}>Igreja vinculada</Text>
          <Text style={highlightValue}>{churchName}</Text>
        </Section>
      ) : null}

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={dashboardUrl}>
          Acessar meu painel
        </Button>
      </Section>

      <Text style={smallText}>
        Se você tiver qualquer dúvida ou precisar de ajuda, entre em contato com
        a liderança do seu ministério ou responda diretamente a este email.
      </Text>
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

const highlightBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "10px",
  padding: "16px",
  margin: "20px 0",
  border: "1px solid #e4e4e7",
};

const highlightLabel = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#71717a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const highlightValue = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: "#18181b",
  margin: 0,
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

const smallText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#71717a",
  margin: "16px 0 0 0",
};
