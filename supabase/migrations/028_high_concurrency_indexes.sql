-- Migration 028: High Concurrency Performance Indexes & Realtime Optimizations (50,000 Active Users Target)
-- Platform: PideYa (Client, KDS, Driver)

-- 1. Index for Restaurant KDS Reception Query (Order Lookup & Filter)
CREATE INDEX IF NOT EXISTS idx_orders_kds_lookup 
ON orders (restaurant_id, status, created_at DESC);

-- 2. Index for Client Orders History & Realtime Subscriptions
CREATE INDEX IF NOT EXISTS idx_orders_client_lookup 
ON orders (client_user_id, status, created_at DESC);

-- 3. Index for Driver Active Assignment & Filtering
CREATE INDEX IF NOT EXISTS idx_orders_driver_assigned 
ON orders (delivery_driver_id, status, created_at DESC);

-- 4. Index for Active Driver GPS Locations & Available Fleets
CREATE INDEX IF NOT EXISTS idx_driver_locations_active 
ON driver_locations (is_online, is_available, updated_at DESC);

-- 5. Index for Menu Items & Availability Lookup
CREATE INDEX IF NOT EXISTS idx_menu_items_available 
ON menu_items (restaurant_id, is_available, created_at DESC);

-- 6. Index for Client Saved Addresses & Profiles
CREATE INDEX IF NOT EXISTS idx_client_profiles_user 
ON client_profiles (user_id);

-- Enable Supabase Realtime replica identity for full payloads on updates
ALTER TABLE orders REPLICA IDENTITY FULL;
