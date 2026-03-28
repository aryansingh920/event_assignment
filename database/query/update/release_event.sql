UPDATE events
SET 
    status = 'available',
    claimed_by = NULL, 
    claimed_at = NULL 
WHERE id = %s
  AND status = 'claimed'
RETURNING id, status, region;
