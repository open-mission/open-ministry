"use client";

import { AdminEvolutionApiCard } from "@/components/settings/admin-evolution-api-card";
import { ChurchInfoCard } from "@/components/settings/church-info-card";
import { ChurchNomenclatureCard } from "@/components/settings/church-nomenclature-card";
import { MessageTemplatesCard } from "@/components/settings/message-templates-card";
import { ModulePermissionsCard } from "@/components/settings/module-permissions-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DepartmentNomenclature } from "@/lib/church";

import type { ChurchTabId, SettingsViewProps } from "./types";

type DesktopChurchPanelsProps = {
  churchTab: ChurchTabId;
  isAdmin: boolean;
  organization: SettingsViewProps["organization"];
  peopleCount: number;
  departmentsCount: number;
  churchWhatsapp: SettingsViewProps["churchWhatsapp"];
  messageTemplates: SettingsViewProps["messageTemplates"];
  permissionSettings: SettingsViewProps["permissionSettings"];
  departmentNomenclature: DepartmentNomenclature | undefined;
};

export function DesktopChurchPanels({
  churchTab,
  isAdmin,
  organization,
  peopleCount,
  departmentsCount,
  churchWhatsapp,
  messageTemplates,
  permissionSettings,
  departmentNomenclature,
}: DesktopChurchPanelsProps) {
  if (!isAdmin) {
    return (
      <div className="max-w-4xl">
        <ChurchInfoCard
          organization={organization}
          isAdmin={false}
          peopleCount={peopleCount}
          departmentsCount={departmentsCount}
        />
      </div>
    );
  }

  switch (churchTab) {
    case "church":
      return (
        <div className="max-w-4xl">
          <ChurchInfoCard
            organization={organization}
            isAdmin={true}
            peopleCount={peopleCount}
            departmentsCount={departmentsCount}
          />
        </div>
      );
    case "whatsapp":
      return (
        <div className="max-w-3xl">
          {churchWhatsapp ? (
            <AdminEvolutionApiCard initialView={churchWhatsapp} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  WhatsApp da Igreja
                </CardTitle>
                <CardDescription>
                  A integração do WhatsApp ainda não está disponível para esta
                  igreja.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      );
    case "templates":
      return (
        <div className="max-w-4xl">
          <MessageTemplatesCard
            initialTemplates={messageTemplates}
            churchName={organization.name}
          />
        </div>
      );
    case "permissions":
      return (
        <div className="max-w-4xl space-y-6">
          <ChurchNomenclatureCard
            initialNomenclature={departmentNomenclature}
          />
          {permissionSettings ? (
            <ModulePermissionsCard initialSettings={permissionSettings} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Módulos & Permissões
                </CardTitle>
                <CardDescription>
                  Não foi possível carregar as configurações de permissões no
                  momento.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      );
  }
}
