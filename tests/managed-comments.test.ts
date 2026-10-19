import { describe, expect, test } from 'bun:test';
import type { Creator, ManagedComment } from '../src/types';
import { getManagedComments, resolveCommentPostId, validateManagedComments } from '../src/utils/managedComments';

const posts = [
  { id: 'first', text: 'Primeira publicação' },
  { id: 'second', text: 'Outra publicação' },
] as Creator['posts'];
const comment = (id: string, extra: Partial<ManagedComment> = {}): ManagedComment => ({
  id, name: 'Nome autorizado', text: 'Texto de teste', time: '', kind: 'demonstration', ...extra,
});
const creator = (managedComments?: ManagedComment[], customPosts = posts) => ({ managedComments, posts: customPosts });

describe('managed public comments', () => {
  test('missing or deliberately empty configuration never generates testimonials', () => {
    expect(getManagedComments(creator())).toEqual([]);
    expect(getManagedComments(creator([]))).toEqual([]);
  });

  test('each post receives general comments and only its own assigned comments', () => {
    const profile = creator([
      comment('general'), comment('first-comment', { postId: 'first' }),
      comment('second-comment', { postId: 'second' }),
    ]);
    expect(getManagedComments(profile, 'first').map((item) => item.id)).toEqual(['general', 'first-comment']);
    expect(getManagedComments(profile, 'second').map((item) => item.id)).toEqual(['general', 'second-comment']);
    expect(getManagedComments(profile).map((item) => item.id)).toEqual(['general']);
  });

  test('caption fallback requires a unique post and explicit IDs take priority', () => {
    const profile = creator([], [...posts, { ...posts[0], id: 'duplicate' }]);
    expect(resolveCommentPostId(profile, undefined, 'Primeira publicação')).toBeUndefined();
    expect(resolveCommentPostId(profile, undefined, 'Outra publicação')).toBe('second');
    expect(resolveCommentPostId(profile, 'first', 'Outra publicação')).toBe('first');
  });

  test('unknown provenance cannot appear as a real published comment', () => {
    const malformed = comment('unknown', { kind: 'unrecognized' as ManagedComment['kind'] });
    expect(getManagedComments(creator([malformed]))[0].kind).toBe('demonstration');
    expect(getManagedComments(creator([comment('real-comment', { kind: 'real' })]))[0].kind).toBe('real');
  });

  test('renderable data ignores photo fields and does not duplicate repeated IDs', () => {
    const withPhoto = { ...comment('same'), photoURL: 'https://example.test/photo.jpg' };
    const result = getManagedComments(creator([withPhoto, comment('same')]));
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('photoURL');
  });
});

describe('comment draft validation', () => {
  test('empty lists, complete examples and authorized real comments are valid', () => {
    expect(validateManagedComments(undefined, posts)).toBeNull();
    expect(validateManagedComments([], posts)).toBeNull();
    expect(validateManagedComments([comment('example'), comment('real', { kind: 'real', postId: 'first' })], posts)).toBeNull();
  });

  test('incomplete or unsupported records cannot be published', () => {
    for (const record of [
      comment('bad-name', { name: ' ' }), comment('bad-text', { text: '' }),
      comment('bad-kind', { kind: undefined as unknown as ManagedComment['kind'] }),
      comment('long-text', { text: 'x'.repeat(2001) }),
      { ...comment('with-photo'), photoURL: 'https://example.test/photo.jpg' },
    ]) expect(validateManagedComments([record], posts)).not.toBeNull();
  });

  test('duplicate IDs, excess comments and missing post associations require correction', () => {
    expect(validateManagedComments([comment('same'), comment('same')], posts)).not.toBeNull();
    expect(validateManagedComments(Array.from({ length: 101 }, (_, index) => comment(`item-${index}`)), posts)).not.toBeNull();
    expect(validateManagedComments([comment('missing', { postId: 'deleted-post' })], posts)).toContain('já não existe');
    expect(validateManagedComments([comment('general', { postId: '' })], posts)).toBeNull();
  });
});
