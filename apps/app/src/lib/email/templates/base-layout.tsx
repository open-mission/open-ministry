import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { getAppBaseUrl } from "@/lib/app-url";

export type BaseEmailLayoutProps = {
  previewText?: string;
  churchName?: string;
  churchLogo?: string | null;
  appLogoUrl?: string | null;
  children: React.ReactNode;
  footerText?: string;
};

export function BaseEmailLayout({
  previewText,
  churchName,
  churchLogo,
  appLogoUrl,
  children,
  footerText,
}: BaseEmailLayoutProps) {
  const brandTitle = churchName ? `${churchName} · OpenMinistry` : "OpenMinistry";
  const logoUrl = churchLogo?.trim();
  const resolvedAppLogoUrl =
    appLogoUrl?.trim() ||
    `${getAppBaseUrl().replace(/\/+$/, "")}/brand/openministry-symbol-black.png`;

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
                    <table role="presentation" cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr>
                          <td style={{ verticalAlign: "middle" as const }}>
                            <Img
                              src={resolvedAppLogoUrl}
                              alt="OpenMinistry"
                              width={30}
                              height={24}
                              style={appSymbolImage}
                            />
                          </td>
                          {logoUrl ? (
                            <>
                              <td style={{ padding: "0 10px", verticalAlign: "middle" as const }}>
                                <span style={logoDivider} />
                              </td>
                              <td style={{ verticalAlign: "middle" as const }}>
                                <Img
                                  src={logoUrl}
                                  alt={churchName ? `Logo da ${churchName}` : "Logo da igreja"}
                                  style={churchLogoImage}
                                />
                              </td>
                            </>
                          ) : null}
                        </tr>
                      </tbody>
                    </table>
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

const appSymbolImage = {
  display: "block",
  width: "30px",
  height: "24px",
  objectFit: "contain" as const,
};

const logoDivider = {
  display: "block",
  width: "1px",
  height: "22px",
  backgroundColor: "#e4e4e7",
};

const churchLogoImage = {
  maxHeight: "36px",
  maxWidth: "120px",
  objectFit: "contain" as const,
  display: "block",
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
