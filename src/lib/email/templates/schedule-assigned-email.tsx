import * as React from "react";
import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { BaseEmailLayout } from "./base-layout";

export type ScheduleAssignedEmailProps = {
  name: string;
  churchName: string;
  eventTitle: string;
  functionName: string;
  eventDate: string;
  eventTime: string;
  eventUrl: string;
  notes?: string;
};

export function ScheduleAssignedEmail({
  name,
  churchName,
  eventTitle,
  functionName,
  eventDate,
  eventTime,
  eventUrl,
  notes,
}: ScheduleAssignedEmailProps) {
  const greeting = name ? `Olá, ${name}!` : "Olá!";

  return (
    <BaseEmailLayout
      previewText={`Você foi escalado(a) para ${eventTitle} (${eventDate}) · ${churchName}`}
      churchName={churchName}
      footerText={`Notificação automática de escala gerada para ${churchName}.`}
    >
      <Heading style={heading}>Nova Escala de Culto 📋</Heading>

      <Text style={paragraph}>{greeting}</Text>

      <Text style={paragraph}>
        Você foi escalado(a) para servir na equipe de <strong>{churchName}</strong>.
        Confira abaixo os detalhes da sua escala:
      </Text>

      <Section style={cardDetails}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Culto / Evento</Text>
                <Text style={detailValue}>{eventTitle}</Text>
              </td>
            </tr>
            <tr>
              <td style={detailRow}>
                <Text style={detailLabel}>Função / Ministério</Text>
                <Text style={detailValueHighlight}>{functionName}</Text>
              </td>
            </tr>
            <tr>
              <td style={detailRow}>
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", verticalAlign: "top" }}>
                        <Text style={detailLabel}>Data</Text>
                        <Text style={detailValue}>{eventDate}</Text>
                      </td>
                      <td style={{ width: "50%", verticalAlign: "top" }}>
                        <Text style={detailLabel}>Horário</Text>
                        <Text style={detailValue}>{eventTime}</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            {notes ? (
              <tr>
                <td style={detailRow}>
                  <Text style={detailLabel}>Observações</Text>
                  <Text style={detailValue}>{notes}</Text>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Section>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={eventUrl}>
          Visualizar detalhes do culto
        </Button>
      </Section>

      <Hr style={subtleDivider} />

      <Text style={tipText}>
        💡 <strong>Dica:</strong> Se houver qualquer imprevisto que impeça sua
        presença, avise seu líder de departamento o quanto antes pelo painel.
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

const cardDetails = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
};

const detailRow = {
  paddingBottom: "14px",
};

const detailLabel = {
  fontSize: "11px",
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
  margin: 0,
};

const detailValueHighlight = {
  fontSize: "16px",
  fontWeight: "700" as const,
  color: "#2563eb",
  margin: 0,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "28px 0 20px 0",
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

const subtleDivider = {
  borderColor: "#f1f5f9",
  margin: "20px 0",
};

const tipText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#64748b",
  margin: 0,
};
