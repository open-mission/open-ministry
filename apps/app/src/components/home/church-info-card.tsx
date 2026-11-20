import { HomeCard, HomeCardContent } from "@/components/home/home-card";
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
  const socialLinks: { key: string; label: string; href: string }[] = [];

  if (churchMeta.phone) {
    socialLinks.push({
      key: "phone",
      label: churchMeta.phone,
      href: `tel:${churchMeta.phone.replace(/[^\d+]/g, "")}`,
    });
  }
  if (churchMeta.instagram) {
    socialLinks.push({
      key: "instagram",
      label: formatInstagramHandle(churchMeta.instagram),
      href: formatInstagramUrl(churchMeta.instagram),
    });
  }
  if (churchMeta.youtube) {
    socialLinks.push({
      key: "youtube",
      label: "YouTube",
      href: formatYoutubeUrl(churchMeta.youtube),
    });
  }
  if (churchMeta.facebook) {
    socialLinks.push({
      key: "facebook",
      label: "Facebook",
      href: formatFacebookUrl(churchMeta.facebook),
    });
  }

  return (
    <section aria-label="Informações da igreja">
      <HomeCard className="relative overflow-hidden border-border/70 bg-gradient-to-br from-amber-500/[0.04] via-card to-primary/[0.02]">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden="true"
        />
        <HomeCardContent className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 shrink-0 rounded-2xl">
              <AvatarImage
                src={organization.logo ?? undefined}
                alt={`Logo de ${organization.name}`}
              />
              <AvatarFallback className="rounded-2xl border-amber-500/30 bg-amber-500/10 font-heading text-base font-semibold text-amber-600 dark:text-amber-400">
                {getInitials(organization.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-heading text-lg font-medium tracking-tight text-foreground">
                {organization.name}
              </p>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Igreja
              </p>
            </div>
          </div>

          {churchMeta.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {churchMeta.description}
            </p>
          ) : null}

          {churchMeta.address ? (
            <div className="flex flex-col gap-1 border-t border-border/50 pt-3">
              <span className="text-[11px] font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Endereço
              </span>
              <span className="text-sm leading-relaxed text-foreground/80">
                {churchMeta.address}
              </span>
            </div>
          ) : null}

          {churchMeta.website ? (
            <a
              href={normalizeWebsite(churchMeta.website)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1 text-sm text-amber-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-400"
            >
              <span aria-hidden="true">↗</span>
              <span className="truncate">{churchMeta.website}</span>
            </a>
          ) : null}

          {socialLinks.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 border-t border-border/50 pt-3">
              {socialLinks.map((link, index) => (
                <span key={link.key} className="inline-flex items-center">
                  {index > 0 ? (
                    <span className="text-muted-foreground" aria-hidden="true">
                      {" · "}
                    </span>
                  ) : null}
                  <a
                    href={link.href}
                    target={link.key === "phone" ? undefined : "_blank"}
                    rel={link.key === "phone" ? undefined : "noreferrer"}
                    className="inline-flex min-h-[44px] items-center px-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </div>
          ) : null}
        </HomeCardContent>
      </HomeCard>
    </section>
  );
}
