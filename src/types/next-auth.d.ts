import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    /** `User.sessionVersion` when this session was issued. */
    sessionVersion?: number;
  }

  // What `authorize` and the adapter hand the `jwt` callback at sign-in.
  interface User {
    sessionVersion?: number;
  }
}

// `next-auth/jwt` only re-exports this; augmenting the re-export doesn't merge.
declare module "@auth/core/jwt" {
  interface JWT {
    sessionVersion?: number;
  }
}
