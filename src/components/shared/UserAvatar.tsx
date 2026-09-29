import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string | null;
  email: string;
  image: string | null;
  className?: string;
}

/** "Brad Traversy" → "BT", "ada" → "A". Falls back to the email's first letter. */
const initials = (name: string | null, email: string) => {
  const letters = (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || email[0]?.toUpperCase() || "?";
};

/**
 * The GitHub image when there is one, initials otherwise. Radix keeps showing
 * the fallback until the image loads, and keeps it if the image fails.
 */
export const UserAvatar = ({ name, email, image, className }: UserAvatarProps) => {
  return (
    <Avatar className={cn("size-8 rounded-full", className)}>
      {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
      <AvatarFallback className="rounded-full text-xs">{initials(name, email)}</AvatarFallback>
    </Avatar>
  );
};
