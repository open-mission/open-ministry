"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2Icon,
  ChurchIcon,
  CrownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HandHeartIcon,
  LockIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  SaveIcon,
  Share2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  updateChurchDetailsAction,
} from "@/app/actions/church";
import { ChurchBrandingForm } from "@/components/church/church-branding-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formatFacebookUrl,
  formatInstagramHandle,
  formatInstagramUrl,
  formatYoutubeUrl,
  parseChurchMetadata,
  type ChurchPublicMetadata,
} from "@/lib/church";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type ChurchInfoCardProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date | string;
    metadata?: string | null;
  };
  isAdmin: boolean;
  peopleCount: number;
  departmentsCount: number;
};

export function ChurchInfoCard({
  organization,
  isAdmin,
  peopleCount,
  departmentsCount,
}: ChurchInfoCardProps) {
  const meta: ChurchPublicMetadata = parseChurchMetadata(organization.metadata);

  const [address, setAddress] = useState(meta.address ?? "");
  const [phone, setPhone] = useState(meta.phone ?? "");
  const [website, setWebsite] = useState(meta.website ?? "");
  const [instagram, setInstagram] = useState(meta.instagram ?? "");
  const [youtube, setYoutube] = useState(meta.youtube ?? "");
  const [facebook, setFacebook] = useState(meta.facebook ?? "");
  const [description, setDescription] = useState(meta.description ?? "");

  const [isPending, startTransition] = useTransition();

  function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", organization.name);
    if (organization.logo) {
      formData.append("logo", organization.logo);
    }
    formData.append("address", address);
    formData.append("phone", phone);
    formData.append("website", website);
    formData.append("instagram", instagram);
    formData.append("youtube", youtube);
    formData.append("facebook", facebook);
    formData.append("description", description);

    startTransition(async () => {
      const res = await updateChurchDetailsAction(undefined, formData);
      if (res?.success) {
        toast.success("Informações da igreja salvas com sucesso!");
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  // Visualização para Membros e Líderes (Read-Only)
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Card Principal da Comunidade */}
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
            {organization.logo ? (
              <Avatar className="size-24 rounded-2xl ring-4 ring-primary/10 sm:size-28">
                <AvatarImage
                  src={organization.logo}
                  alt={`Logo de ${organization.name}`}
                />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  <ChurchIcon className="size-12" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="flex size-24 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-4 ring-primary/10 sm:size-28">
                <ChurchIcon className="size-12" />
              </span>
            )}

            <div className="space-y-1.5 max-w-lg">
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                {organization.name}
              </h2>
              {meta.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
                <UsersIcon className="size-3.5 text-primary" />
                {peopleCount} voluntários e membros
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
                <HandHeartIcon className="size-3.5 text-primary" />
                {departmentsCount} departamentos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contato & Localização Pública */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg tracking-tight flex items-center gap-2">
              <Building2Icon className="size-4 text-primary" />
              Informações Oficiais &amp; Contato
            </CardTitle>
            <CardDescription className="text-xs">
              Canais oficiais e localização da comunidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Endereço */}
              <div className="rounded-xl border p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPinIcon className="size-3.5 text-primary" />
                  <span>Endereço</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {meta.address || "Endereço não informado"}
                </p>
                {meta.address ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary gap-1"
                    asChild
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        meta.address,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir no Google Maps
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </Button>
                ) : null}
              </div>

              {/* Telefone / WhatsApp */}
              <div className="rounded-xl border p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <PhoneIcon className="size-3.5 text-emerald-600" />
                  <span>Telefone &amp; WhatsApp</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {meta.phone || "Telefone não informado"}
                </p>
                {meta.phone ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-emerald-600 dark:text-emerald-400 gap-1"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${meta.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircleIcon className="size-3" />
                      Chamar no WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>

              {/* Website */}
              <div className="rounded-xl border p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <GlobeIcon className="size-3.5 text-primary" />
                  <span>Site Oficial</span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {meta.website || "Site não cadastrado"}
                </p>
                {meta.website ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary gap-1"
                    asChild
                  >
                    <a
                      href={meta.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Acessar portal
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </Button>
                ) : null}
              </div>

              {/* Redes Sociais */}
              <div className="rounded-xl border p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Share2Icon className="size-3.5 text-primary" />
                  <span>Redes Sociais</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meta.instagram ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      asChild
                    >
                      <a
                        href={formatInstagramUrl(meta.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <InstagramIcon className="size-3.5 text-pink-600" />
                        {formatInstagramHandle(meta.instagram)}
                      </a>
                    </Button>
                  ) : null}

                  {meta.youtube ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      asChild
                    >
                      <a
                        href={formatYoutubeUrl(meta.youtube)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <YoutubeIcon className="size-3.5 text-red-600" />
                        YouTube
                      </a>
                    </Button>
                  ) : null}

                  {meta.facebook ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      asChild
                    >
                      <a
                        href={formatFacebookUrl(meta.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Facebook
                      </a>
                    </Button>
                  ) : null}

                  {!meta.instagram && !meta.youtube && !meta.facebook ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma rede social configurada.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed bg-muted/20 p-3 flex items-center gap-2.5 text-xs text-muted-foreground">
              <LockIcon className="size-4 shrink-0" />
              <span>
                As informações públicas da igreja são gerenciadas pelos administradores da plataforma.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Visualização para Administradores (Edição Completa)
  return (
    <div className="space-y-6">
      {/* 1. Identidade Visual */}
      <Card className="border-primary/20 bg-primary/[0.01]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground gap-1 font-normal">
              <CrownIcon className="size-3" />
              Painel Administrativo
            </Badge>
          </div>
          <CardTitle className="font-heading text-xl tracking-tight">
            Identidade da Igreja
          </CardTitle>
          <CardDescription>
            Personalize o nome oficial e o logotipo da igreja exibidos no painel, aplicativo móvel e convites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChurchBrandingForm
            name={organization.name}
            logo={organization.logo}
          />
        </CardContent>
      </Card>

      {/* 2. Informações Públicas e Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">
            Informações Públicas &amp; Redes Sociais
          </CardTitle>
          <CardDescription>
            Esses dados ficam visíveis para todos os membros e integrantes da comunidade no painel e aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDetails} className="space-y-5">
            <FieldGroup className="space-y-4">
              {/* Descrição Institucional */}
              <Field>
                <FieldLabel htmlFor="church-description">
                  Sobre a Comunidade / Missão
                </FieldLabel>
                <Textarea
                  id="church-description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da igreja ou comunidade..."
                  rows={2}
                  maxLength={500}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Endereço */}
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="church-address">
                    Endereço Completo
                  </FieldLabel>
                  <Input
                    id="church-address"
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                    maxLength={250}
                  />
                </Field>

                {/* Telefone / WhatsApp */}
                <Field>
                  <FieldLabel htmlFor="church-phone">
                    Telefone Oficial / WhatsApp
                  </FieldLabel>
                  <Input
                    id="church-phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    maxLength={30}
                  />
                </Field>

                {/* Website */}
                <Field>
                  <FieldLabel htmlFor="church-website">
                    Site Oficial
                  </FieldLabel>
                  <Input
                    id="church-website"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Ex: https://igrejaexemplo.com.br"
                  />
                </Field>

                {/* Instagram */}
                <Field>
                  <FieldLabel htmlFor="church-instagram">
                    Instagram Oficial
                  </FieldLabel>
                  <Input
                    id="church-instagram"
                    name="instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="Ex: @minhaigreja"
                    maxLength={80}
                  />
                </Field>

                {/* YouTube */}
                <Field>
                  <FieldLabel htmlFor="church-youtube">
                    Canal no YouTube
                  </FieldLabel>
                  <Input
                    id="church-youtube"
                    name="youtube"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="Ex: @minhaigreja ou URL"
                    maxLength={120}
                  />
                </Field>

                {/* Facebook */}
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="church-facebook">
                    Página no Facebook
                  </FieldLabel>
                  <Input
                    id="church-facebook"
                    name="facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="Ex: minhaigreja ou URL"
                    maxLength={120}
                  />
                </Field>
              </div>
            </FieldGroup>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending} className="gap-2">
                <SaveIcon className="size-4" />
                {isPending ? "Salvando..." : "Salvar informações públicas"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Governança e Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">
            Governança e Recursos da Igreja
          </CardTitle>
          <CardDescription>
            Acesso rápido às áreas estratégicas de gestão da sua comunidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start justify-between rounded-xl border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-primary" />
                  <span className="font-medium text-sm">Pessoas e Membros</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {peopleCount} pessoas cadastradas na igreja.
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                    <Link href="/dashboard/members">
                      Gerenciar pessoas
                      <ExternalLinkIcon className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between rounded-xl border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HandHeartIcon className="size-4 text-primary" />
                  <span className="font-medium text-sm">Departamentos e Ministérios</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {departmentsCount} departamentos ativos.
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                    <Link href="/dashboard/departments">
                      Gerenciar departamentos
                      <ExternalLinkIcon className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
