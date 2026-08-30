export interface ActivationToken {
  id: string;
  user_id: string;
  used_at: Date | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}
