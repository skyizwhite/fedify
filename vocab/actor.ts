import { toASCII, toUnicode } from "node:punycode";
import { lookupWebFinger } from "../webfinger/lookup.ts";
import { Application, Group, Organization, Person, Service } from "./vocab.ts";

/**
 * Actor types are {@link Object} types that are capable of performing
 * activities.
 */
export type Actor = Application | Group | Organization | Person | Service;

/**
 * Checks if the given object is an {@link Actor}.
 * @param object The object to check.
 * @returns `true` if the given object is an {@link Actor}.
 */
export function isActor(object: unknown): object is Actor {
  return (
    object instanceof Application ||
    object instanceof Group ||
    object instanceof Organization ||
    object instanceof Person ||
    object instanceof Service
  );
}

/**
 * A string representation of an actor type name.
 */
export type ActorTypeName =
  | "Application"
  | "Group"
  | "Organization"
  | "Person"
  | "Service";

/**
 * Gets the type name of the given actor.
 * @param actor The actor to get the type name of.
 * @returns The type name of the given actor.
 */
export function getActorTypeName(
  actor: Actor,
): ActorTypeName {
  if (actor instanceof Application) return "Application";
  else if (actor instanceof Group) return "Group";
  else if (actor instanceof Organization) return "Organization";
  else if (actor instanceof Person) return "Person";
  else if (actor instanceof Service) return "Service";
  throw new Error("Unknown actor type.");
}

/**
 * Gets the actor class by the given type name.
 * @param typeName The type name to get the actor class by.
 * @returns The actor class by the given type name.
 */
export function getActorClassByTypeName(
  typeName: ActorTypeName,
):
  | typeof Application
  | typeof Group
  | typeof Organization
  | typeof Person
  | typeof Service {
  switch (typeName) {
    case "Application":
      return Application;
    case "Group":
      return Group;
    case "Organization":
      return Organization;
    case "Person":
      return Person;
    case "Service":
      return Service;
  }
  throw new Error("Unknown actor type name.");
}

/**
 * Gets the actor handle, of the form `@username@domain`, from the given actor
 * or an actor URI.
 *
 * @example
 * ``` typescript
 * // Get the handle of an actor object:
 * await getActorHandle(
 *   new Person({ id: new URL("https://todon.eu/users/hongminhee") })
 * );
 *
 * // Get the handle of an actor URI:
 * await getActorHandle(new URL("https://todon.eu/users/hongminhee"));
 * ```
 *
 * @param actor The actor or actor URI to get the handle from.
 * @param options The options for normalizing the actor handle.
 * @returns The actor handle.  It starts with `@` and is followed by the
 *          username and domain, separated by `@` by default (it can be
 *          customized with the options).
 * @throws {TypeError} If the actor does not have enough information to get the
 *                     handle.
 * @since 0.4.0
 */
export async function getActorHandle(
  actor: Actor | URL,
  options: NormalizeActorHandleOptions = {},
): Promise<`@${string}@${string}` | `${string}@${string}`> {
  const actorId = actor instanceof URL ? actor : actor.id;
  if (actorId != null) {
    const result = await lookupWebFinger(actorId);
    if (result != null) {
      const aliases = [...(result.aliases ?? [])];
      if (result.subject != null) aliases.unshift(result.subject);
      for (const alias of aliases) {
        const match = alias.match(/^acct:([^@]+)@([^@]+)$/);
        if (match != null) {
          return normalizeActorHandle(`@${match[1]}@${match[2]}`, options);
        }
      }
    }
  }
  if (
    !(actor instanceof URL) && actor.preferredUsername != null &&
    actor.id != null
  ) {
    return normalizeActorHandle(
      `@${actor.preferredUsername}@${actor.id.host}`,
      options,
    );
  }
  throw new TypeError(
    "Actor does not have enough information to get the handle.",
  );
}

/**
 * Options for {@link normalizeActorHandle}.
 * @since 0.9.0
 */
export interface NormalizeActorHandleOptions {
  /**
   * Whether to trim the leading `@` from the actor handle.  Turned off by
   * default.
   */
  trimLeadingAt?: boolean;

  /**
   * Whether to convert the domain part of the actor handle to punycode, if it
   * is an internationalized domain name.  Turned off by default.
   */
  punycode?: boolean;
}

/**
 * Normalizes the given actor handle.
 * @param handle The full handle of the actor to normalize.
 * @param options The options for normalizing the actor handle.
 * @returns The normalized actor handle.
 * @throws {TypeError} If the actor handle is invalid.
 * @since 0.9.0
 */
export function normalizeActorHandle(
  handle: string,
  options: NormalizeActorHandleOptions = {},
): `@${string}@${string}` | `${string}@${string}` {
  handle = handle.replace(/^@/, "");
  const atPos = handle.indexOf("@");
  if (atPos < 1) throw new TypeError("Invalid actor handle.");
  let domain = handle.substring(atPos + 1);
  if (domain.length < 1 || domain.includes("@")) {
    throw new TypeError("Invalid actor handle.");
  }
  domain = domain.toLowerCase();
  domain = options.punycode ? toASCII(domain) : toUnicode(domain);
  domain = domain.toLowerCase();
  const user = handle.substring(0, atPos);
  return options.trimLeadingAt ? `${user}@${domain}` : `@${user}@${domain}`;
}

/**
 * The object that can be a recipient of an activity.
 *
 * Note that every {@link Actor} is also a {@link Recipient}.
 */
export interface Recipient {
  /**
   * The URI of the actor.
   */
  readonly id: URL | null;

  /**
   * The URI of the actor's inbox.
   */
  readonly inboxId: URL | null;

  /**
   * The endpoints of the actor.
   */
  readonly endpoints?: {
    /**
     * The URI of the actor's shared inbox.
     */
    sharedInbox: URL | null;
  } | null;
}
