-- Create Database
CREATE DATABASE bhoomisanket_db;

-- Connect to the database (User needs to switch connection or run this in the DB)
\c bhoomisanket_db;

-- Enable PostGIS
CREATE EXTENSION postgis;

-- Create User and Grant Privileges
CREATE USER bhoomi_admin WITH PASSWORD 'securepassword';
GRANT ALL PRIVILEGES ON DATABASE bhoomisanket_db TO bhoomi_admin;
-- Grant schema usage for public/postgis if needed
GRANT ALL ON SCHEMA public TO bhoomi_admin;
