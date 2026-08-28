-- ============================================================
-- RLS POLICIES FOR NOTIFICATIONS (INSERT & DELETE)
-- ============================================================

-- Allow authenticated users to send/insert notifications
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);
