-- Runs once, when the postgres volume is created. The app database
-- (POSTGRES_DB=logisur) is created by the image; this adds the one the
-- backend e2e tests reset and use.
CREATE DATABASE logisur_test;
