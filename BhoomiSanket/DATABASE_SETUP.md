# Database Setup Guide

This project uses **PostgreSQL** with the **PostGIS** extension. Since the database runs locally on your machine, you must set it up manually after cloning the repository.

## 1. Prerequisites
- Install [PostgreSQL](https://www.postgresql.org/download/)
- Install [PostGIS extension](https://postgis.net/install/)

## 2. Initialize Database
Open your SQL shell (psql) or a tool like pgAdmin and run:

```sql
CREATE DATABASE bhoomisanket_db;
```

Enable PostGIS (if required for map services):
```sql
\c bhoomisanket_db;
CREATE EXTENSION postgis;
```

## 3. Create Tables
The backend uses SQLAlchemy to automatically create tables, but if you need to run them manually:
- `farmers`: Stores user registration data.
- `soil_samples`: Stores detailed soil analysis points.
- `soil_crop_data`: (Imported from CSV).
- `soil_germination_data`: Stores suitability analysis.

## 4. Import CSV Data
To import the `Crop_recommendation.csv` into the `soil_crop_data` table:

1. Create the table structure:
```sql
CREATE TABLE soil_crop_data (
    subdistrict_name VARCHAR(150) PRIMARY KEY,
    district_name VARCHAR(100),
    state_name VARCHAR(100),
    nitrogen INTEGER,
    phosphorus INTEGER,
    potassium INTEGER,
    temperature FLOAT,
    humidity FLOAT,
    ph FLOAT,
    rainfall FLOAT
);
```

2. Import the CSV:
```sql
COPY soil_crop_data FROM '/path/to/Crop_recommendation.csv' DELIMITER ',' CSV HEADER;
```
*Note: Replace `/path/to/` with the actual absolute path to the file on your computer.*

## 5. Configure Backend
Copy the `.env.example` (or create a `.env` file) in the `backend/` directory and set your credentials:

```dotenv
DATABASE_URL=postgresql://your_username:your_password@127.0.0.1:5432/bhoomisanket_db
```

**Why can't I just share my credentials?**
The database is hosted on your local machine (`127.0.0.1`). If you share your password, others will still be connecting to their own local computers, not yours. For a shared database, you would need to use a cloud provider like Supabase or AWS RDS.
