import Link from "next/link";

// Shared by /sign-in and /register: the route group adds no URL segment.
const AuthLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Link href="/" className="text-xl font-semibold tracking-tight">
        DevStash
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
};

export default AuthLayout;
