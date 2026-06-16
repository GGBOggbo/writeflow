import { describe, expect, it } from "vitest";
import { createAuthOptions } from "./auth-options";

describe("createAuthOptions", () => {
  it("keeps password auth enabled without sending link-based auth emails", () => {
    const options = createAuthOptions({} as never);

    expect(options.emailAndPassword?.enabled).toBe(true);
    expect(options.emailAndPassword?.requireEmailVerification).toBe(true);
    expect(options.emailAndPassword?.sendResetPassword).toBeUndefined();
    expect(options.emailAndPassword?.onExistingUserSignUp).toBeUndefined();
    expect(options.emailVerification?.sendOnSignUp).toBe(false);
    expect(options.emailVerification?.sendOnSignIn).toBe(false);
    expect(options.emailVerification?.sendVerificationEmail).toBeUndefined();
  });
});
