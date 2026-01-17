-- Force PostgREST schema cache reload so newly created RPCs are immediately available
NOTIFY pgrst, 'reload schema';