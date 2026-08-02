import {
  CreditCard,
  FileText,
  FolderKanban,
  Flower2,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Newspaper,
  Plane,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

const PATRONES: Array<{ patron: RegExp; icono: LucideIcon }> = [
  { patron: /siniestr/i, icono: ShieldAlert },
  { patron: /viajer/i, icono: Plane },
  { patron: /noticia/i, icono: Newspaper },
  { patron: /salud|directorio m[eé]dico/i, icono: HeartPulse },
  { patron: /puntos de atenci[oó]n/i, icono: MapPin },
  { patron: /wompi/i, icono: CreditCard },
  { patron: /exequia/i, icono: Flower2 },
  { patron: /documento|acrobat/i, icono: FileText },
  { patron: /pensionado|administrador/i, icono: Users },
  { patron: /banner|portal web/i, icono: LayoutDashboard },
];

export function RequerimientoIcono({
  nombre,
  item,
  className,
}: {
  nombre: string;
  item: string;
  className?: string;
}) {
  const texto = `${nombre} ${item}`;
  for (const { patron, icono: Icono } of PATRONES) {
    if (patron.test(texto)) return <Icono className={className} />;
  }
  return <FolderKanban className={className} />;
}
