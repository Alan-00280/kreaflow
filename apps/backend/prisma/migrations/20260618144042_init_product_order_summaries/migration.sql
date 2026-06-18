-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('pesan_vendor', 'ambil_stok');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('null', 'ambil_di_sekretariat', 'menghubungi_vendor', 'diproses_vendor', 'diterima_dari_vendor', 'belum_menghubungi_vendor');

-- CreateTable
CREATE TABLE "product_order_summaries" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "order_started_date" DATE NOT NULL,
    "order_end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_order_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summary_products" (
    "id" BIGSERIAL NOT NULL,
    "summary_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "fulfillment_type" "FulfillmentType" NOT NULL DEFAULT 'pesan_vendor',
    "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'null',

    CONSTRAINT "summary_products_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "summary_products" ADD CONSTRAINT "summary_products_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "product_order_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_products" ADD CONSTRAINT "summary_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
