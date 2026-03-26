INSERT INTO events (content, region, status)
            VALUES (%s, %s, 'available')
            RETURNING id;
