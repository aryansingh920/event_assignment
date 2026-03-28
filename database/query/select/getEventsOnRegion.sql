SELECT *
FROM events
WHERE region = $1;
  -- AND status = 'available'
