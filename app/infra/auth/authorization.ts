// ACTION:RESOURCE:MODIFIER

type Action = "create" | "read" | "update" | "delete";
type Resource = "users" | "session" | "token";
type Modifier = "own" | "any";

export type Permission = `${Action}:${Resource}:${Modifier}`;

// ------ PERMISSIONS ------
// Define every permission actually granted in the system here.
// `satisfies Record<string, Permission>` keeps each value checked against
// the ACTION:RESOURCE:MODIFIER shape while still inferring literal types.
export const PERMISSIONS = {
  READ_OWN_USER: "read:users:own",
  READ_OWN_SESSION: "read:session:own",
  READ_OWN_TOKEN: "read:token:own",
  CREATE_OWN_SESSION: "create:session:own",
} as const satisfies Record<string, Permission>;

export const isValidPermission = (permission: unknown): permission is Permission =>
  typeof permission === "string" && (Object.values(PERMISSIONS) as string[]).includes(permission);
