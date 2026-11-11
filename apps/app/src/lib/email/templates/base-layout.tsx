import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type BaseEmailLayoutProps = {
  previewText?: string;
  churchName?: string;
  children: React.ReactNode;
  footerText?: string;
};

export function BaseEmailLayout({
  previewText,
  churchName,
  children,
  footerText,
}: BaseEmailLayoutProps) {
  const brandTitle = churchName ? `${churchName} · OpenMinistry` : "OpenMinistry";

  return (
    <Html lang="pt-BR">
      <Head />
      {previewText ? <Preview>{previewText}</Preview> : null}
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td>
                    <div style={logoBadge}>
                      <span style={logoBadgeText}>OM</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" as const }}>
                    <Text style={headerBrandText}>{brandTitle}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Content Card */}
          <Section style={cardContent}>{children}</Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerParagraph}>
              {footerText ||
                "Este é um email transacional enviado pelo OpenMinistry para sua segurança e acompanhamento da comunidade."}
            </Text>
            <Text style={footerSubParagraph}>
              © {new Date().getFullYear()} OpenMinistry — Gestão eclesiástica colaborativa e inteligente.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f5f7",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: "0 auto",
  padding: "32px 16px",
};

const container = {
  maxWidth: "580px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  overflow: "hidden" as const,
};

const headerSection = {
  padding: "24px 32px 20px 32px",
  backgroundColor: "#fafafa",
  borderBottom: "1px solid #f1f2f4",
};

const logoBadge = {
  width: "36px",
  height: "36px",
  borderRadius: "10px",
  backgroundColor: "#18181b",
  display: "inline-block",
  textAlign: "center" as const,
  lineHeight: "36px",
};

const logoBadgeText = {
  color: "#ffffff",
  fontWeight: "bold" as const,
  fontSize: "14px",
  letterSpacing: "-0.5px",
};

const headerBrandText = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 600,
  color: "#52525b",
  letterSpacing: "0.2px",
};

const cardContent = {
  padding: "32px",
};

const divider = {
  borderColor: "#f1f2f4",
  margin: "0 32px",
};

const footerSection = {
  padding: "24px 32px 32px 32px",
  backgroundColor: "#ffffff",
};

const footerParagraph = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#71717a",
  margin: "0 0 8px 0",
};

const footerSubParagraph = {
  fontSize: "11px",
  lineHeight: "16px",
  color: "#a1a1aa",
  margin: 0,
};
