import * as SecureStore from 'expo-secure-store';

const POST_DRAFT_KEY = 'create_post_draft_v1';
const CHAT_DRAFT_PREFIX = 'chat_draft_v1_';
const GROUP_CHAT_DRAFT_PREFIX = 'group_chat_draft_v1_';
const COMMUNITY_FORM_DRAFT_KEY = 'create_community_draft_v1';
const DATING_PROFILE_DRAFT_KEY = 'dating_profile_setup_draft_v1';
const COMMUNITY_SEARCH_DRAFT_KEY = 'community_search_draft_v1';
const FRIEND_SEARCH_DRAFT_KEY = 'friend_search_draft_v1';
const CHAT_DRAFT_INDEX_KEY = 'chat_draft_index_v1';
const GROUP_CHAT_DRAFT_INDEX_KEY = 'group_chat_draft_index_v1';

function buildChatDraftKey(otherUserId: string): string {
  return `${CHAT_DRAFT_PREFIX}${otherUserId}`;
}

function buildGroupChatDraftKey(communityId: string): string {
  return `${GROUP_CHAT_DRAFT_PREFIX}${communityId}`;
}

async function getIndexSet(indexKey: string): Promise<Set<string>> {
  const raw = await SecureStore.getItemAsync(indexKey);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function saveIndexSet(indexKey: string, values: Set<string>): Promise<void> {
  if (values.size === 0) {
    await SecureStore.deleteItemAsync(indexKey);
    return;
  }
  await SecureStore.setItemAsync(indexKey, JSON.stringify([...values]));
}

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

export async function getChatDraft(otherUserId: string): Promise<string> {
  const value = await SecureStore.getItemAsync(buildChatDraftKey(otherUserId));
  return value ?? '';
}

export async function saveChatDraft(otherUserId: string, text: string): Promise<void> {
  const key = buildChatDraftKey(otherUserId);
  const index = await getIndexSet(CHAT_DRAFT_INDEX_KEY);
  if (!text.trim()) {
    await SecureStore.deleteItemAsync(key);
    index.delete(otherUserId);
    await saveIndexSet(CHAT_DRAFT_INDEX_KEY, index);
    return;
  }
  await SecureStore.setItemAsync(key, text);
  index.add(otherUserId);
  await saveIndexSet(CHAT_DRAFT_INDEX_KEY, index);
}

export async function clearChatDraft(otherUserId: string): Promise<void> {
  await SecureStore.deleteItemAsync(buildChatDraftKey(otherUserId));
  const index = await getIndexSet(CHAT_DRAFT_INDEX_KEY);
  index.delete(otherUserId);
  await saveIndexSet(CHAT_DRAFT_INDEX_KEY, index);
}

export async function getGroupChatDraft(communityId: string): Promise<string> {
  const value = await SecureStore.getItemAsync(buildGroupChatDraftKey(communityId));
  return value ?? '';
}

export async function saveGroupChatDraft(communityId: string, text: string): Promise<void> {
  const key = buildGroupChatDraftKey(communityId);
  const index = await getIndexSet(GROUP_CHAT_DRAFT_INDEX_KEY);
  if (!text.trim()) {
    await SecureStore.deleteItemAsync(key);
    index.delete(communityId);
    await saveIndexSet(GROUP_CHAT_DRAFT_INDEX_KEY, index);
    return;
  }
  await SecureStore.setItemAsync(key, text);
  index.add(communityId);
  await saveIndexSet(GROUP_CHAT_DRAFT_INDEX_KEY, index);
}

export async function clearGroupChatDraft(communityId: string): Promise<void> {
  await SecureStore.deleteItemAsync(buildGroupChatDraftKey(communityId));
  const index = await getIndexSet(GROUP_CHAT_DRAFT_INDEX_KEY);
  index.delete(communityId);
  await saveIndexSet(GROUP_CHAT_DRAFT_INDEX_KEY, index);
}

export type CreateCommunityDraft = {
  name: string;
  description: string;
  pinLocation: boolean;
};

export async function getCreateCommunityDraft(): Promise<CreateCommunityDraft | null> {
  const value = await SecureStore.getItemAsync(COMMUNITY_FORM_DRAFT_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CreateCommunityDraft;
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      pinLocation: Boolean(parsed.pinLocation),
    };
  } catch {
    return null;
  }
}

export async function saveCreateCommunityDraft(draft: CreateCommunityDraft): Promise<void> {
  if (!draft.name.trim() && !draft.description.trim() && !draft.pinLocation) {
    await SecureStore.deleteItemAsync(COMMUNITY_FORM_DRAFT_KEY);
    return;
  }
  await SecureStore.setItemAsync(COMMUNITY_FORM_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearCreateCommunityDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(COMMUNITY_FORM_DRAFT_KEY);
}

export type DatingProfileDraft = {
  photos: string[];
  age: string;
  bio: string;
  active: boolean;
  prompts: { prompt: string; answer: string }[];
};

export async function getDatingProfileDraft(): Promise<DatingProfileDraft | null> {
  const value = await SecureStore.getItemAsync(DATING_PROFILE_DRAFT_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DatingProfileDraft;
    return {
      photos: Array.isArray(parsed.photos) ? parsed.photos : ['', ''],
      age: parsed.age ?? '',
      bio: parsed.bio ?? '',
      active: parsed.active ?? true,
      prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
    };
  } catch {
    return null;
  }
}

export async function saveDatingProfileDraft(draft: DatingProfileDraft): Promise<void> {
  const hasPhotos = draft.photos.some((p) => p.trim().length > 0);
  const hasPrompts = draft.prompts.some(
    (p) => p.prompt.trim().length > 0 || p.answer.trim().length > 0,
  );
  const hasAnyContent =
    hasPhotos || hasPrompts || draft.age.trim().length > 0 || draft.bio.trim().length > 0 || !draft.active;

  if (!hasAnyContent) {
    await SecureStore.deleteItemAsync(DATING_PROFILE_DRAFT_KEY);
    return;
  }
  await SecureStore.setItemAsync(DATING_PROFILE_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearDatingProfileDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(DATING_PROFILE_DRAFT_KEY);
}

export async function getCommunitySearchDraft(): Promise<string> {
  return (await SecureStore.getItemAsync(COMMUNITY_SEARCH_DRAFT_KEY)) ?? '';
}

export async function saveCommunitySearchDraft(query: string): Promise<void> {
  if (!query.trim()) {
    await SecureStore.deleteItemAsync(COMMUNITY_SEARCH_DRAFT_KEY);
    return;
  }
  await SecureStore.setItemAsync(COMMUNITY_SEARCH_DRAFT_KEY, query);
}

export async function clearCommunitySearchDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(COMMUNITY_SEARCH_DRAFT_KEY);
}

export async function getFriendSearchDraft(): Promise<string> {
  return (await SecureStore.getItemAsync(FRIEND_SEARCH_DRAFT_KEY)) ?? '';
}

export async function saveFriendSearchDraft(query: string): Promise<void> {
  if (!query.trim()) {
    await SecureStore.deleteItemAsync(FRIEND_SEARCH_DRAFT_KEY);
    return;
  }
  await SecureStore.setItemAsync(FRIEND_SEARCH_DRAFT_KEY, query);
}

export async function clearFriendSearchDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(FRIEND_SEARCH_DRAFT_KEY);
}

export async function clearAllDrafts(): Promise<void> {
  await Promise.all([
    clearPostDraft(),
    clearCreateCommunityDraft(),
    clearDatingProfileDraft(),
    clearCommunitySearchDraft(),
    clearFriendSearchDraft(),
  ]);

  const [chatIndex, groupIndex] = await Promise.all([
    getIndexSet(CHAT_DRAFT_INDEX_KEY),
    getIndexSet(GROUP_CHAT_DRAFT_INDEX_KEY),
  ]);

  await Promise.all([
    ...[...chatIndex].map((otherUserId) =>
      SecureStore.deleteItemAsync(buildChatDraftKey(otherUserId)),
    ),
    ...[...groupIndex].map((communityId) =>
      SecureStore.deleteItemAsync(buildGroupChatDraftKey(communityId)),
    ),
    SecureStore.deleteItemAsync(CHAT_DRAFT_INDEX_KEY),
    SecureStore.deleteItemAsync(GROUP_CHAT_DRAFT_INDEX_KEY),
  ]);
}
