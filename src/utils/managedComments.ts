import type { Creator, CreatorPost, ManagedComment } from '../types';

export const MANAGED_COMMENT_LIMIT = 100;
const allowedKeys = new Set(['id', 'name', 'text', 'time', 'kind', 'postId']);

/** Presentation only: authentication is not proof of an active paid subscription. */
export function areCommentsRestricted(creator: Pick<Creator, 'commentsAccess'>): boolean {
  return creator.commentsAccess !== undefined && creator.commentsAccess !== 'public';
}

/** Reject incomplete drafts before they become shared public content. */
export function validateManagedComments(value: unknown, posts: ReadonlyArray<Pick<CreatorPost, 'id'>> = []): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > MANAGED_COMMENT_LIMIT) return 'Podes publicar até 100 comentários por perfil.';
  const ids = new Set<string>();
  for (let index = 0; index < value.length; index++) {
    const comment = value[index];
    const label = `Comentário ${index + 1}`;
    if (!comment || typeof comment !== 'object' || Array.isArray(comment)
        || Object.keys(comment).some((key) => !allowedKeys.has(key))) return `${label}: formato inválido.`;
    if (typeof comment.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(comment.id) || ids.has(comment.id)) return `${label}: identificador inválido ou repetido.`;
    ids.add(comment.id);
    if (typeof comment.name !== 'string' || !comment.name.trim() || comment.name.length > 120) return `${label}: preenche o nome, até 120 caracteres.`;
    if (typeof comment.text !== 'string' || !comment.text.trim() || comment.text.length > 2000) return `${label}: preenche o texto, até 2.000 caracteres.`;
    if (typeof comment.time !== 'string' || comment.time.length > 80) return `${label}: a data apresentada deve ter até 80 caracteres.`;
    if (comment.kind !== 'demonstration' && comment.kind !== 'real') return `${label}: escolhe “Demonstrativo” ou “Real, com autorização”.`;
    if (comment.postId !== undefined && (typeof comment.postId !== 'string' || comment.postId.length > 128
        || (comment.postId !== '' && !posts.some((post) => post.id === comment.postId)))) {
      return `${label}: a publicação associada já não existe. Escolhe outra ou “Geral do perfil”.`;
    }
  }
  return null;
}

/** An explicit post ID wins. A caption is only a fallback when it identifies exactly one post. */
export function resolveCommentPostId(creator: Pick<Creator, 'posts'>, postId?: string, postCaption?: string): string | undefined {
  if (postId) return postId;
  if (!postCaption) return undefined;
  const matches = (creator.posts || []).filter((post) => post.text === postCaption);
  return matches.length === 1 ? matches[0].id : undefined;
}

/** No built-in testimonials. Missing or empty configuration means an empty public thread. */
export function getManagedComments(creator: Pick<Creator, 'managedComments' | 'posts' | 'commentsAccess'>, postId?: string, postCaption?: string): ManagedComment[] {
  // The public CMS has no server-verified subscriber entitlement. Never unlock here
  // from a Google login, a local flag or a payment redirect. Restricted comments
  // remain hidden until a private, authorized backend is implemented.
  if (areCommentsRestricted(creator)) return [];
  const selectedPost = resolveCommentPostId(creator, postId, postCaption);
  if (!Array.isArray(creator.managedComments)) return [];
  const seen = new Set<string>();
  return creator.managedComments.slice(0, MANAGED_COMMENT_LIMIT).flatMap((item) => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)
        || typeof item.name !== 'string' || !item.name.trim()
        || typeof item.text !== 'string' || !item.text.trim()) return [];
    if (item.postId && item.postId !== selectedPost) return [];
    seen.add(item.id);
    // Unrecognized provenance always remains explicitly demonstrative.
    return [{ id: item.id, name: item.name.slice(0, 120), text: item.text.slice(0, 2000),
      time: typeof item.time === 'string' ? item.time.slice(0, 80) : '',
      kind: item.kind === 'real' ? 'real' : 'demonstration',
      ...(typeof item.postId === 'string' && item.postId ? { postId: item.postId } : {}),
    } as ManagedComment];
  });
}
