import * as SecureStore from 'expo-secure-store';

const POST_DRAFT_KEY = 'create_post_draft_v1';

export async function getPostDraft(): Promise<string> {
  const value = await SecureStore.getItemAsync(POST_DRAFT_KEY);
  return value ?? '';
}

export async function savePostDraft(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(POST_DRAFT_KEY);
    return;
  }
  await SecureStore.setItemAsync(POST_DRAFT_KEY, text);
}

export async function clearPostDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(POST_DRAFT_KEY);
}
