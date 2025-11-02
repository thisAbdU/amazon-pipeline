-- Create products table
CREATE TABLE IF NOT EXISTS products (
    asin VARCHAR(10) PRIMARY KEY,
    title TEXT NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(10) NOT NULL REFERENCES products(asin) ON DELETE CASCADE,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    availability TEXT,
    seller VARCHAR(255),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offer_history table
CREATE TABLE IF NOT EXISTS offer_history (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(10) NOT NULL REFERENCES products(asin) ON DELETE CASCADE,
    price DECIMAL(10, 2),
    currency VARCHAR(3),
    availability TEXT,
    seller VARCHAR(255),
    change_type VARCHAR(50),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient latest offer queries
CREATE INDEX IF NOT EXISTS idx_offers_latest ON offers(product_id, fetched_at DESC);

-- Create index on offer_history for sparkline queries
CREATE INDEX IF NOT EXISTS idx_offer_history_product_fetched ON offer_history(product_id, fetched_at DESC);

-- Create view for latest offers
CREATE OR REPLACE VIEW v_latest_offers AS
SELECT DISTINCT ON (product_id)
    o.id,
    o.product_id,
    o.price,
    o.currency,
    o.availability,
    o.seller,
    o.fetched_at
FROM offers o
ORDER BY o.product_id, o.fetched_at DESC;

-- Seed data for development/demo purposes
-- Insert sample products
INSERT INTO products (asin, title, brand, category, image_url, created_at, updated_at)
VALUES 
    ('B07XJ8C8F5', 'Echo Dot (4th Gen, 2020 release) | Smart speaker with Alexa | Charcoal', 'Amazon Echo & Alexa', 'Electronics', 'https://m.media-amazon.com/images/I/21Q1l9xX--L._AC_SX450_.jpg', NOW(), NOW()),
    ('B09JQMJSXY', 'PlayStation 5 Console', 'Sony', 'Video Games', 'https://m.media-amazon.com/images/I/01f+GVvouTS._AC_SL1500_.jpg', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    ('B08N5WRWNW', 'Apple AirPods Pro (2nd Generation)', 'Apple', 'Electronics', 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('B0B7BP6CJN', 'Samsung 55" Class OLED 4K S95B Series', 'Samsung', 'Electronics', 'https://m.media-amazon.com/images/I/71rxRHsH1zL._AC_SL1500_.jpg', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('B08G9PRS1K', 'Nintendo Switch OLED Model', 'Nintendo', 'Video Games', 'https://m.media-amazon.com/images/I/61i06mLslDL._AC_SL1500_.jpg', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('B07HZLHPKP', 'Echo Show 5 (1st Gen, 2019 release) -- Smart display with Alexa – stay connected with video calling - Charcoal', 'Amazon Echo & Alexa', 'Electronics', 'https://m.media-amazon.com/images/I/21oVN+ZH9NL._AC_.jpg', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('B09B8V1LZ3', 'iPad Air (5th Generation)', 'Apple', 'Electronics', 'https://m.media-amazon.com/images/I/61W7WQHZWXL._AC_SL1500_.jpg', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    ('B07YVLGXJV', 'Kindle Paperwhite (11th Generation)', 'Amazon', 'Electronics', 'https://m.media-amazon.com/images/I/61ZPDQoWBfL._AC_SL1000_.jpg', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days')
ON CONFLICT (asin) DO NOTHING;

-- Insert sample offers (only if they don't exist for these products)
INSERT INTO offers (product_id, price, currency, availability, seller, fetched_at)
SELECT * FROM (VALUES 
    ('B07XJ8C8F5'::VARCHAR, 29.99, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '1 hour'),
    ('B09JQMJSXY'::VARCHAR, 499.99, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '2 hours'),
    ('B08N5WRWNW'::VARCHAR, 249.00, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '3 hours'),
    ('B0B7BP6CJN'::VARCHAR, 1299.99, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '4 hours'),
    ('B08G9PRS1K'::VARCHAR, 349.99, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '5 hours'),
    ('B07HZLHPKP'::VARCHAR, 84.99, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '6 hours'),
    ('B09B8V1LZ3'::VARCHAR, 599.00, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '7 hours'),
    ('B07YVLGXJV'::VARCHAR, 139.99, 'USD', 'In Stock', 'Amazon.com', NOW() - INTERVAL '8 hours')
) AS v(asin, price, currency, availability, seller, fetched_at)
WHERE NOT EXISTS (
    SELECT 1 FROM offers WHERE product_id = v.asin
);

-- Insert some price history for sparkline visualization
-- Echo Dot price variations over the last 30 days
INSERT INTO offer_history (product_id, price, currency, availability, seller, change_type, fetched_at)
SELECT 
    'B07XJ8C8F5',
    29.99 + (RANDOM() * 5 - 2.5), -- Price between 27.49 and 32.49
    'USD',
    CASE WHEN RANDOM() > 0.2 THEN 'In Stock' ELSE 'Limited Stock' END,
    'Amazon.com',
    'price_change',
    NOW() - (s * INTERVAL '1 day')
FROM generate_series(1, 30) s
WHERE NOT EXISTS (SELECT 1 FROM offer_history WHERE product_id = 'B07XJ8C8F5' LIMIT 1);

-- PlayStation 5 price history
INSERT INTO offer_history (product_id, price, currency, availability, seller, change_type, fetched_at)
SELECT 
    'B09JQMJSXY',
    499.99 + (RANDOM() * 20 - 10), -- Price between 489.99 and 509.99
    'USD',
    CASE WHEN RANDOM() > 0.3 THEN 'In Stock' ELSE 'Only 3 left in stock' END,
    'Amazon.com',
    'price_change',
    NOW() - (s * INTERVAL '1 day')
FROM generate_series(1, 30) s
WHERE NOT EXISTS (SELECT 1 FROM offer_history WHERE product_id = 'B09JQMJSXY' LIMIT 1);

-- AirPods Pro price history
INSERT INTO offer_history (product_id, price, currency, availability, seller, change_type, fetched_at)
SELECT 
    'B08N5WRWNW',
    249.00 + (RANDOM() * 30 - 15), -- Price between 234.00 and 264.00
    'USD',
    'In Stock',
    'Amazon.com',
    'price_change',
    NOW() - (s * INTERVAL '1 day')
FROM generate_series(1, 30) s
WHERE NOT EXISTS (SELECT 1 FROM offer_history WHERE product_id = 'B08N5WRWNW' LIMIT 1);

