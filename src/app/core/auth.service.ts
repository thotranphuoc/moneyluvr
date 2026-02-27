import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './db/supabase.service';
import type { User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSig = signal<User | null>(null);
  private authReadySig = signal(false);

  readonly user = this.userSig.asReadonly();
  readonly authReady = this.authReadySig.asReadonly();

  constructor(private supabase: SupabaseService) {
    // Chỉ đánh dấu authReady sau khi đã đọc session từ localStorage; tránh onAuthStateChange fire trước với null
    this.supabase.supabase.auth.getSession().then(({ data: { session } }) => {
      this.userSig.set(session?.user ?? null);
      this.authReadySig.set(true);
    }).catch(() => {
      this.authReadySig.set(true);
    });
    // Cập nhật user khi đăng nhập/đăng xuất sau khi app đã load
    this.supabase.supabase.auth.onAuthStateChange((_event, session) => {
      this.userSig.set(session?.user ?? null);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async register(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async logout(): Promise<void> {
    await this.supabase.supabase.auth.signOut();
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await this.supabase.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`
    });
    if (error) throw error;
  }
}
