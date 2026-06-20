-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('lunas', 'belum_lunas');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('belum_diambil', 'sudah_diambil', 'ditunda');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'belum_lunas',
ADD COLUMN     "pickup_status" "PickupStatus" NOT NULL DEFAULT 'belum_diambil';
