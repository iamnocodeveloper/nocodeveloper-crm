import type { Branding } from "@/lib/branding";
import { faviconHref, faviconInitial } from "@/lib/favicon";
import { cn } from "@/lib/utils";

/** Lo que la marca necesita para dibujarse: nombre, acento y logo subido. */
export type BrandingMark = Pick<Branding, "name" | "accent" | "favicon">;

/**
 * Mosaico cuadrado con degradado del acento: es el favicon en grande. Con un
 * logo subido lleva el logo (el MISMO archivo y la MISMA URL versionada que la
 * pestaña); sin él, la inicial del nombre.
 */
export function BrandTile({
  branding,
  className,
}: {
  branding: BrandingMark;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "brand-tile flex shrink-0 items-center justify-center overflow-hidden text-brand-fg",
        className
      )}
      aria-hidden
    >
      {branding.favicon ? (
        // Sin next/image a propósito: es un archivo de una ruta propia, ya
        // pequeño; pasarlo por el optimizador sería trabajo para no ahorrar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconHref(branding)}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="font-bold leading-none">
          {faviconInitial(branding.name)}
        </span>
      )}
    </span>
  );
}

type LogoSize = "md" | "lg";

const TILE_SIZE = {
  md: "h-[30px] w-[30px] rounded-[9px] text-[15px]",
  lg: "h-[44px] w-[44px] rounded-[13px] text-[22px]",
} as const;

/**
 * La marca completa: mosaico con el logo o la inicial, y el nombre. Con logo
 * subido gana el logo, se llame como se llame.
 */
export function BrandLogo({
  branding,
  size = "md",
  className,
}: {
  branding: BrandingMark;
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandTile branding={branding} className={TILE_SIZE[size]} />
      <span
        className={cn(
          "truncate font-[750] leading-none tracking-tight",
          size === "lg" ? "text-[26px]" : "text-[17px]"
        )}
      >
        {branding.name}
      </span>
    </span>
  );
}
