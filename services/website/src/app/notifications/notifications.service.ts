import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';

export type NotificationType =
  | 'CHALLENGE_RECEIVED'
  | 'CHALLENGE_ACCEPTED'
  | 'CHALLENGE_DECLINED'
  | 'CHALLENGE_CANCELLED'
  | 'MATCH_COMPLETED'
  | 'MATCH_DISPUTED'
  | 'DISPUTE_RESOLVED'
  | 'DISPUTE_AWAITING_MODERATION'
  | 'REF_DECISION_DISPUTED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private readonly API_URL = `${environment.apiUrl}/notifications`;
  private destroyRef = inject(DestroyRef);
  private pollingActive = false;

  unreadCount = signal<number>(0);
  notifications = signal<Notification[]>([]);

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly = false): Observable<Notification[]> {
    const url = unreadOnly ? `${this.API_URL}?unreadOnly=true` : this.API_URL;
    return this.http.get<Notification[]>(url);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_URL}/unread-count`);
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.API_URL}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.API_URL}/read-all`, {});
  }

  loadNotifications(): void {
    this.getNotifications().subscribe(notifications => {
      this.notifications.set(notifications);
    });
  }

  loadUnreadCount(): void {
    this.getUnreadCount().subscribe(result => {
      this.unreadCount.set(result.count);
    });
  }

  startPolling(intervalMs = 30000): void {
    if (this.pollingActive) return;
    this.pollingActive = true;

    // Initial load
    this.loadUnreadCount();
    this.loadNotifications();

    // Poll for updates
    interval(intervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadUnreadCount();
        this.loadNotifications();
      });
  }

  stopPolling(): void {
    this.pollingActive = false;
  }

  clearNotifications(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.pollingActive = false;
  }

  refreshNotifications(): void {
    this.loadUnreadCount();
    this.loadNotifications();
  }

  markNotificationAsRead(id: string): void {
    this.markAsRead(id).subscribe(updatedNotification => {
      const currentNotifications = this.notifications();
      const updated = currentNotifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      );
      this.notifications.set(updated);
      this.unreadCount.update(count => Math.max(0, count - 1));
    });
  }

  markAllNotificationsAsRead(): void {
    this.markAllAsRead().subscribe(() => {
      const currentNotifications = this.notifications();
      const updated = currentNotifications.map(n => ({ ...n, isRead: true }));
      this.notifications.set(updated);
      this.unreadCount.set(0);
    });
  }
}
