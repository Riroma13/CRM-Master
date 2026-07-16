-- Add nombre and telefono fields to ClientUser for self-registration
ALTER TABLE "ClientUser" ADD COLUMN "nombre" TEXT;
ALTER TABLE "ClientUser" ADD COLUMN "telefono" TEXT;
