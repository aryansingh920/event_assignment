UPDATE events
SET status = 'available'
WHERE id = %s
  AND status = 'claimed'   -- Guard: only reset if still 'claimed', not 'completed'
RETURNING id, status;
