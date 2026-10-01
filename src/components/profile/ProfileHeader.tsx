import { CalendarDays } from "lucide-react";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/format";

interface ProfileHeaderProps {
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}

export const ProfileHeader = ({ name, email, image, createdAt }: ProfileHeaderProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <UserAvatar
          name={name}
          email={email}
          image={image}
          className="size-20"
          fallbackClassName="text-2xl"
        />
        <div className="min-w-0">
          {/* GitHub profiles may have no display name; the email stands in. */}
          <h2 className="font-heading truncate text-xl font-semibold">{name ?? email}</h2>
          {name ? <p className="text-muted-foreground truncate text-sm">{email}</p> : null}
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-xs sm:justify-start">
            <CalendarDays className="size-3.5" />
            Joined {formatLongDate(createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
