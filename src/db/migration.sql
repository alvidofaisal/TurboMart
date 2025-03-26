-- CockroachDB-compatible migration script for TurboMart
-- This avoids using DO blocks which are not compatible with CockroachDB

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  slug TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  collection_id INTEGER NOT NULL,
  image_url TEXT
);
CREATE INDEX IF NOT EXISTS categories_collection_id_idx ON categories (collection_id);

-- Create subcollections table
CREATE TABLE IF NOT EXISTS subcollections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS subcollections_category_slug_idx ON subcollections (category_slug);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  slug TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  subcollection_id INTEGER NOT NULL,
  image_url TEXT
);
CREATE INDEX IF NOT EXISTS subcategories_subcollection_id_idx ON subcategories (subcollection_id);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  slug TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  subcategory_slug TEXT NOT NULL,
  image_url TEXT
);
-- Note: CockroachDB supports GIN indexes but the syntax might need adjustment
CREATE INDEX IF NOT EXISTS name_search_index ON products USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS name_trgm_index ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_subcategory_slug_idx ON products (subcategory_slug);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints separately
-- Categories to Collections
ALTER TABLE categories 
ADD CONSTRAINT fk_categories_collection_id 
FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;

-- Subcollections to Categories
ALTER TABLE subcollections 
ADD CONSTRAINT fk_subcollections_category_slug 
FOREIGN KEY (category_slug) REFERENCES categories(slug) ON DELETE CASCADE;

-- Subcategories to Subcollections
ALTER TABLE subcategories 
ADD CONSTRAINT fk_subcategories_subcollection_id 
FOREIGN KEY (subcollection_id) REFERENCES subcollections(id) ON DELETE CASCADE;

-- Products to Subcategories
ALTER TABLE products 
ADD CONSTRAINT fk_products_subcategory_slug 
FOREIGN KEY (subcategory_slug) REFERENCES subcategories(slug) ON DELETE CASCADE; 