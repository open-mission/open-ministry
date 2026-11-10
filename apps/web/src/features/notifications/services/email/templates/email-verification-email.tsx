import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type EmailVerificationEmailProps = {
  name?: string;
  verifyUrl: string;
};

export function EmailVerificationEmail({
  name,
  verifyUrl,
}: EmailVerificationEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return (
    <BaseEmailLayout
      previewText="Confirme seu endereço de email no OpenMinistry"
      footerText="Se você não criou uma conta no OpenMinistry, desconsidere esta mensagem."
    >
      <Heading style={heading}>Confirme seu Email ✉️</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Text style={paragraph}>
        Obrigado por se juntar ao OpenMinistry! Para garantir a segurança da sua
        conta e receber as escalas e avisos importantes, confirme seu endereço de
        email clicando no botão abaixo:
      </Text>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={verifyUrl}>
          Confirmar meu email
        </Button>
      </Section>

      <Text style={subtleText}>
        Se você estiver enfrentando dificuldades com o botão, copie e cole o
        link abaixo no navegador:
      </Text>
      <Text style={linkText}>{verifyUrl}</Text>
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
  backgroundColor: "#16a34a",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "10px",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
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
