import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
  Font,
} from "@react-pdf/renderer";
import type { ComputedPlanItem } from "@/lib/plan-utils";

// Disable automatic English hyphenation so Portuguese words wrap naturally by full word
Font.registerHyphenationCallback((word) => [word]);

/**
 * Strips emoji unicode characters and unprintable surrogate pairs from text strings
 * to prevent font glyph corruption and overlapping text in standard PDF engines.
 */
export function sanitizePdfText(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu,
      "",
    )
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function CalendarIconSvg({
  size = 9.5,
  color = "#64748b",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function ClockIconSvg({
  size = 9.5,
  color = "#64748b",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 6v6l4 2M22 12A10 10 0 112 12a10 10 0 0120 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function MapPinIconSvg({
  size = 9.5,
  color = "#64748b",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12 13a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

function MusicIconSvg({
  size = 8,
  color = "#0284c7",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f172a",
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orgInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orgLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    objectFit: "cover",
  },
  orgName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 9,
    color: "#64748b",
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  summaryStat: {
    flexDirection: "column",
  },
  summaryStatLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
    fontWeight: "bold",
  },
  summaryStatValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  sectionHeader: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#ffffff",
  },
  sectionDescription: {
    fontSize: 8,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  itemRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },
  itemRowEven: {
    backgroundColor: "#fafafa",
  },
  timeCol: {
    width: "16%",
    paddingRight: 6,
  },
  timeStart: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  timeDuration: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 1,
  },
  detailsCol: {
    width: "48%",
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1e293b",
  },
  itemDescription: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 1.3,
  },
  songCol: {
    width: "20%",
    paddingRight: 6,
  },
  songTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 2,
  },
  songIconWrapper: {
    marginTop: 1.5,
  },
  songTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#0284c7",
    flex: 1,
  },
  songArtist: {
    fontSize: 7.5,
    color: "#64748b",
  },
  songMeta: {
    fontSize: 7.5,
    color: "#0369a1",
    marginTop: 1,
    fontWeight: "bold",
  },
  respCol: {
    width: "16%",
  },
  respName: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    fontSize: 7.5,
    color: "#94a3b8",
  },
  pageNumber: {
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

export type EventPlanPdfData = {
  organizationName: string;
  organizationLogo?: string | null;
  eventTitle: string;
  kindLabel?: string;
  dateLabel: string;
  timeLabel: string;
  location?: string | null;
  items: ComputedPlanItem[];
  totalPlannedSeconds: number;
};

export function EventPlanPdfDocument({
  organizationName,
  organizationLogo,
  eventTitle,
  kindLabel = "Culto",
  dateLabel,
  timeLabel,
  location,
  items,
  totalPlannedSeconds,
}: EventPlanPdfData) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) return `${hours}h ${remMins.toString().padStart(2, "0")}m`;
    return `${mins} min`;
  };

  const totalItemsCount = items.filter((i) => i.type === "item").length;
  const totalSongsCount = items.filter(
    (i) => i.type === "item" && (i.songId || i.song),
  ).length;

  return (
    <Document
      title={`Cronograma - ${sanitizePdfText(eventTitle)}`}
      author="OpenMinistry"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.orgInfo}>
              {organizationLogo ? (
                /* eslint-disable-next-line jsx-a11y/alt-text */
                <Image src={organizationLogo} style={styles.orgLogo} />
              ) : null}
              <Text style={styles.orgName}>
                {sanitizePdfText(organizationName)}
              </Text>
            </View>
            <Text style={styles.badge}>{sanitizePdfText(kindLabel)}</Text>
          </View>

          <Text style={styles.eventTitle}>{sanitizePdfText(eventTitle)}</Text>

          <View style={styles.eventMetaRow}>
            <View style={styles.metaItem}>
              <CalendarIconSvg size={9.5} color="#64748b" />
              <Text style={styles.metaText}>{sanitizePdfText(dateLabel)}</Text>
            </View>
            <View style={styles.metaItem}>
              <ClockIconSvg size={9.5} color="#64748b" />
              <Text style={styles.metaText}>{sanitizePdfText(timeLabel)}</Text>
            </View>
            {location ? (
              <View style={styles.metaItem}>
                <MapPinIconSvg size={9.5} color="#64748b" />
                <Text style={styles.metaText}>{sanitizePdfText(location)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Total de Momentos</Text>
            <Text style={styles.summaryStatValue}>{totalItemsCount}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Músicas / Louvores</Text>
            <Text style={styles.summaryStatValue}>{totalSongsCount}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Tempo Litúrgico</Text>
            <Text style={styles.summaryStatValue}>
              {formatTime(totalPlannedSeconds)}
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Documento Oficial</Text>
            <Text style={styles.summaryStatValue}>Cronograma</Text>
          </View>
        </View>

        {/* List of Plan Items */}
        {items.map((item, idx) => {
          if (item.type === "header") {
            return (
              <View
                key={item.id || idx}
                style={styles.sectionHeader}
                wrap={false}
              >
                <Text style={styles.sectionTitle}>
                  {sanitizePdfText(item.title)}
                </Text>
                {item.description ? (
                  <Text style={styles.sectionDescription}>
                    {sanitizePdfText(item.description)}
                  </Text>
                ) : null}
              </View>
            );
          }

          const responsibleName =
            item.person?.name || item.customResponsible || "—";

          return (
            <View
              key={item.id || idx}
              style={[styles.itemRow, idx % 2 === 0 ? styles.itemRowEven : {}]}
              wrap={false}
            >
              {/* Horário e Duração */}
              <View style={styles.timeCol}>
                <Text style={styles.timeStart}>{item.timeLabel}</Text>
                <Text style={styles.timeDuration}>({item.durationLabel})</Text>
              </View>

              {/* Título e Descrição */}
              <View style={styles.detailsCol}>
                <Text style={styles.itemTitle}>
                  {sanitizePdfText(item.title)}
                </Text>
                {item.description ? (
                  <Text style={styles.itemDescription}>
                    {sanitizePdfText(item.description)}
                  </Text>
                ) : null}
              </View>

              {/* Música se houver */}
              <View style={styles.songCol}>
                {item.song ? (
                  <>
                    <View style={styles.songTitleRow}>
                      <View style={styles.songIconWrapper}>
                        <MusicIconSvg size={8} color="#0284c7" />
                      </View>
                      <Text style={styles.songTitle}>
                        {sanitizePdfText(item.song.title)}
                      </Text>
                    </View>
                    {item.song.artist ? (
                      <Text style={styles.songArtist}>
                        {sanitizePdfText(item.song.artist)}
                      </Text>
                    ) : null}
                    {item.song.tone ? (
                      <Text style={styles.songMeta}>
                        Tom: {item.song.tone}
                        {item.song.bpm ? ` • ${item.song.bpm} BPM` : ""}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ fontSize: 7.5, color: "#cbd5e1" }}>—</Text>
                )}
              </View>

              {/* Responsável */}
              <View style={styles.respCol}>
                <Text style={styles.respName}>
                  {sanitizePdfText(responsibleName)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>OpenMinistry • Gestão Litúrgica</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
