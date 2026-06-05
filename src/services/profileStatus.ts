import * as SecureStore from 'expo-secure-store';

export const CAMPUS_VIBE_OPTIONS = [
  'Locked In',
  'Side Quest',
  'Main Character',
  'Social Battery Full',
  'Ghost Mode',
  'Caffeine Powered',
  'Recovery Mode',
  'Down For Anything',
] as const;

export const CAMPUS_SPOT_OPTIONS = [
  'library hideout',
  'coffee run',
  'sunset walk',
  'late-night food mission',
  'study sprint',
  'gym reset',
  'music tunnel vision',
  'random adventure',
] as const;

export const CAMPUS_ANTHEM_OPTIONS = [
  'Silence. I need grades.',
  'One good song on repeat.',
  'Anything with bass.',
  'Whatever matches the weather.',
  'A playlist I refuse to share.',
  'Something dramatic for no reason.',
] as const;

const PROFILE_STATUS_KEY = 'profile_status_v1';

export type ProfileStatusDraft = {
  vibe: string;
  mission: string;
  anthem: string;
};

export const EMPTY_PROFILE_STATUS: ProfileStatusDraft = {
  vibe: '',
  mission: '',
  anthem: '',
};

export async function getProfileStatusDraft(): Promise<ProfileStatusDraft> {
  const value = await SecureStore.getItemAsync(PROFILE_STATUS_KEY);
  if (!value) return EMPTY_PROFILE_STATUS;

  try {
    const parsed = JSON.parse(value) as Partial<ProfileStatusDraft>;
    return {
      vibe: parsed.vibe ?? '',
      mission: parsed.mission ?? '',
      anthem: parsed.anthem ?? '',
    };
  } catch {
    return EMPTY_PROFILE_STATUS;
  }
}

export async function saveProfileStatusDraft(draft: ProfileStatusDraft): Promise<void> {
  const hasAnyContent =
    draft.vibe.trim().length > 0 ||
    draft.mission.trim().length > 0 ||
    draft.anthem.trim().length > 0;

  if (!hasAnyContent) {
    await SecureStore.deleteItemAsync(PROFILE_STATUS_KEY);
    return;
  }

  await SecureStore.setItemAsync(PROFILE_STATUS_KEY, JSON.stringify(draft));
}

export async function clearProfileStatusDraft(): Promise<void> {
  await SecureStore.deleteItemAsync(PROFILE_STATUS_KEY);
}

