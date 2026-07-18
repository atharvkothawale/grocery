-- 1. Create the reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    review_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Anyone can view reviews
CREATE POLICY "Allow public select reviews" ON reviews
    FOR SELECT USING (true);

-- 4. Policy: Logged-in users can insert their own reviews
CREATE POLICY "Allow authenticated insert reviews" ON reviews
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Seed the table with the 4 existing hardcoded reviews
INSERT INTO reviews (name, review_text, rating, user_id) VALUES
('John Doe', 'Great quality products and fast delivery!', 5, NULL),
('Jane Smith', 'Best prices and excellent customer service', 5, NULL),
('Mike Johnson', 'Fresh products every time I order', 5, NULL),
('Sarah Williams', 'Convenient shopping experience', 5, NULL);
