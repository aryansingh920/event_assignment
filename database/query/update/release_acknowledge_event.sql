UPDATE events
SET 
    status = 'acknowledged',
    acknowledged_at = NOW()
WHERE id = %s
  AND status = 'claimed'
RETURNING id, status, region;
