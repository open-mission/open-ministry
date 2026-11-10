import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type ResetPasswordEmailProps = {
  name?: string;
  resetUrl: string;
  expiresInMinutes?: number;
};

export function ResetPasswordEmail({
  name,
  resetUrl,
  expiresInMinutes = 60,
}: ResetPasswordEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return (
    <BaseEmailLayout
      previewText="Instruções para redefinir sua senha no OpenMinistry"
      footerText="Se você não solicitou a redefinição de senha, desconsidere esta mensagem. Sua conta permanece segura."
    >
      <Heading style={heading}>Redefinição de Senha 🔒</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Text style={paragraph}>
        Recebemos uma solicitação para alterar a senha da sua conta no
        OpenMinistry. Clique no botão abaixo para definir sua nova senha com
        segurança:
      </Text>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={resetUrl}>
          Redefinir minha senha
        </Button>
      </Section>

      <Section style={infoBox}>
        <Text style={infoText}>
          ⏳ Este link de segurança expira em{" "}
          <strong>{expiresInMinutes} minutos</strong>. Após esse período, será
          necessário solicitar novamente.
        </Text>
      </Section>

      <Text style={subtleText}>
        Se o botão acima não funcionar, copie e cole este endereço no seu
        navegador:
      </Text>
      <Text style={linkText}>{resetUrl}</Text>
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
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "10px",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};

const infoBox = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "20px 0",
};

const infoText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#92400e",
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
