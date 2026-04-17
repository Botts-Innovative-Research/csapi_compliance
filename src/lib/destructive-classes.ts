// Identifies conformance class URIs that perform write/mutating operations
// against the IUT. Used by the configure UI (to gate the Start button behind
// a confirmation checkbox) and by the server (to enforce the same gate at the
// API boundary, preventing curl-bypass of the client-side check).

export function isDestructiveClass(uri: string): boolean {
  return (
    uri.includes('/conf/create-replace-delete') ||
    uri.includes('/conf/update')
  );
}

export function selectedHasDestructive(uris: readonly string[]): boolean {
  return uris.some(isDestructiveClass);
}
