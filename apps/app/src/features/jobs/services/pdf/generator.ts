import "server-only";

import React from "react";
import { renderToBuffer, renderToStream } from "@react-pdf/renderer";
import {
  EventPlanPdfDocument,
  type EventPlanPdfData,
} from "@/components/events/event-plan-pdf-document";

/**
 * Renders the Event Plan PDF document to a NodeJS ReadableStream for streaming responses.
 */
export async function generateEventPlanPdfStream(data: EventPlanPdfData) {
  const element = React.createElement(EventPlanPdfDocument, data);
  return await renderToStream(
    element as unknown as Parameters<typeof renderToStream>[0],
  );
}

/**
 * Renders the Event Plan PDF document to a Buffer for background jobs and file uploads.
 */
export async function generateEventPlanPdfBuffer(
  data: EventPlanPdfData,
): Promise<Buffer> {
  const element = React.createElement(EventPlanPdfDocument, data);
  return await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0],
  );
}
