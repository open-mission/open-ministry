import {
  CameraIcon,
  GlobeIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  PlayIcon,
} from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import {
  HomeSection,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { HomeListItem } from "@/components/home/home-list-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatFacebookUrl,
  formatInstagramHandle,
  formatInstagramUrl,
  formatYoutubeUrl,
  type ChurchPublicMetadata,
} from "@/lib/church";
import { getInitials } from "@/lib/format";

type ChurchIdentity = {
  name: string;
  logo: string | null;
};

function normalizeWebsite(value: string): string {
  if (/^https?:\/\//.test(value)) return value;
  return `https://${value}`;
}

export function ChurchInfoCard({
  organization,
  churchMeta,
}: {
  organization: ChurchIdentity;
  churchMeta: ChurchPublicMetadata;
}) {
  const contacts: {
    key: string;
    label: string;
    href?: string;
    icon: typeof GlobeIcon;
  }[] = [];

  if (churchMeta.address) {
    contacts.push({
      key: "address",
      label: churchMeta.address,
      icon: MapPinIcon,
    });
  }

  if (churchMeta.website) {
    contacts.push({
      key: "website",
      label: churchMeta.website,
      href: normalizeWebsite(churchMeta.website),
      icon: GlobeIcon,
    });
  }

  if (churchMeta.phone) {
    contacts.push({
      key: "phone",
      label: churchMeta.phone,
      href: `tel:${churchMeta.phone.replace(/[^\d+]/g, "")}`,
      icon: PhoneIcon,
    });
  }

  if (churchMeta.instagram) {
    contacts.push({
      key: "instagram",
      label: formatInstagramHandle(churchMeta.instagram),
      href: formatInstagramUrl(churchMeta.instagram),
      icon: CameraIcon,
    });
  }

  if (churchMeta.youtube) {
    contacts.push({
      key: "youtube",
      label: "YouTube",
      href: formatYoutubeUrl(churchMeta.youtube),
      icon: PlayIcon,
    });
  }

  if (churchMeta.facebook) {
    contacts.push({
      key: "facebook",
      label: "Facebook",
      href: formatFacebookUrl(churchMeta.facebook),
      icon: MessageCircleIcon,
    });
  }

  return (
    <HomeSection aria-labelledby="home-church-title">
      <HomeSectionTitle id="home-church-title">
        Informações da igreja
      </HomeSectionTitle>

      <HomeCard>
        <HomeCardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 shrink-0 rounded-xl">
              <AvatarImage
                src={organization.logo ?? undefined}
                alt={`Logo de ${organization.name}`}
              />
              <AvatarFallback className="rounded-xl bg-primary/10 font-heading text-base font-semibold text-primary">
                {getInitials(organization.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-heading text-lg font-medium tracking-tight text-foreground">
                {organization.name}
              </p>
              <p className="text-xs text-muted-foreground">Igreja</p>
            </div>
          </div>

          {churchMeta.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {churchMeta.description}
            </p>
          ) : null}

          {contacts.length > 0 ? (
            <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
              {contacts.map(({ key, label, href, icon: Icon }) => {
                const content = (
                  <HomeListItem
                    leading={<Icon className="size-4 text-primary" aria-hidden="true" />}
                    title={label}
                    className="px-0 hover:bg-transparent"
                  />
                );

                return href ? (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={key}>{content}</div>
                );
              })}
            </div>
          ) : null}
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}
