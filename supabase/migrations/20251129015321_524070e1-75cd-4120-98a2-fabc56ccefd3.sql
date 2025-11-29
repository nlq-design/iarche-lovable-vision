-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable realtime for newsletter_subscribers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_subscribers;