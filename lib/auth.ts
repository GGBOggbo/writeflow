import { betterAuth } from "better-auth";
import { createAuthDatabase } from "./auth-database";
import { createAuthOptions } from "./auth-options";
import { getDatabaseConfig } from "./database";

const databaseConfig = getDatabaseConfig();
const database = createAuthDatabase(databaseConfig);

export const auth = betterAuth(createAuthOptions(database));
