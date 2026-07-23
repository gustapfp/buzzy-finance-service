export interface Session {
  id: string;
  token: string;
  expires_at: Date;
  user_id: string;
  user_agent: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface BaseSession {
  user_id: string;
  user_agent: string;
  timezone: string;
}
