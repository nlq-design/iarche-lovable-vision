-- Atomic status transition with concurrent-safe history append
CREATE OR REPLACE FUNCTION public.ai_action_transition_status(
  _action_id uuid,
  _new_status text,
  _actor text,
  _reason text,
  _snooze_days integer DEFAULT NULL,
  _by text DEFAULT NULL
)
RETURNS public.ai_actions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _row public.ai_actions;
  _previous_status text;
  _now timestamptz := now();
  _snooze_until timestamptz := NULL;
  _completed_at timestamptz;
  _entry jsonb;
  _label text;
BEGIN
  IF _new_status NOT IN ('pending','acknowledged','snoozed','done','dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', _new_status;
  END IF;
  IF _actor NOT IN ('user','system') THEN
    RAISE EXCEPTION 'Invalid actor: %', _actor;
  END IF;

  -- Lock the row to serialize concurrent transitions
  SELECT * INTO _row FROM public.ai_actions WHERE id = _action_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ai_action % not found', _action_id;
  END IF;

  _previous_status := _row.status;

  IF _new_status = 'snoozed' AND _snooze_days IS NOT NULL THEN
    _snooze_until := _now + (_snooze_days || ' days')::interval;
  END IF;

  IF _new_status IN ('done','dismissed') THEN
    _completed_at := _now;
  ELSE
    _completed_at := _row.completed_at;
  END IF;

  _label := CASE _new_status
    WHEN 'pending' THEN 'Réouvert'
    WHEN 'acknowledged' THEN 'Marqué comme vu'
    WHEN 'snoozed' THEN COALESCE('Reporté de ' || _snooze_days || 'j', 'Reporté')
    WHEN 'done' THEN 'Marqué traité'
    WHEN 'dismissed' THEN 'Marqué non pertinent'
  END;

  _entry := jsonb_build_object(
    'at', to_char(_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'by', COALESCE(_by, CASE WHEN _actor = 'system' THEN 'system' ELSE 'user' END),
    'kind', 'status',
    'text', _label || ' — ' || COALESCE(NULLIF(trim(_reason), ''), _label),
    'meta', jsonb_build_object(
      'status', _new_status,
      'previous_status', _previous_status,
      'actor', _actor,
      'reason', COALESCE(NULLIF(trim(_reason), ''), _label),
      'snoozeDays', _snooze_days,
      'at', to_char(_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  );

  UPDATE public.ai_actions
  SET status = _new_status,
      snooze_until = CASE WHEN _new_status = 'snoozed' THEN _snooze_until ELSE NULL END,
      completed_at = _completed_at,
      user_notes = COALESCE(user_notes, '[]'::jsonb) || jsonb_build_array(_entry),
      updated_at = _now
  WHERE id = _action_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ai_action_transition_status(uuid, text, text, text, integer, text) TO authenticated, service_role;