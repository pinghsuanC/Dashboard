import Link from "next/link";

import { APP_NAME } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";

// Shared by the sign-in, register and password-reset pages: the route group
// adds no URL segment.
const AuthLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Link href={ROUTES.home} className="text-xl font-semibold tracking-tight">
        {APP_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
};

export default AuthLayout;
