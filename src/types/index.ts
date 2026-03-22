export type RootStackParamList = {
  Main: undefined;
  CreatePost: undefined;
};

export type TabParamList = {
  Feed: undefined;
  Map: undefined;
  Messages: undefined;
  Profile: undefined;
};

export interface Post {
  id: string;
  content: string;
  created_at: string;
  school_id: string;
  upvote_count: number;
}

export type CreatePostInput = Pick<Post, 'content' | 'school_id'>;
