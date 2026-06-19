-- AlterTable
ALTER TABLE "bundle_products" ADD COLUMN     "variant_group_id" BIGINT,
ALTER COLUMN "product_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "variant_group_id" BIGINT;

-- CreateTable
CREATE TABLE "variant_product_groups" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_bundle_variant_selections" (
    "id" BIGSERIAL NOT NULL,
    "order_item_id" BIGINT NOT NULL,
    "variant_group_id" BIGINT NOT NULL,
    "selected_product_id" BIGINT NOT NULL,

    CONSTRAINT "order_bundle_variant_selections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_variant_group_id_fkey" FOREIGN KEY ("variant_group_id") REFERENCES "variant_product_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_products" ADD CONSTRAINT "bundle_products_variant_group_id_fkey" FOREIGN KEY ("variant_group_id") REFERENCES "variant_product_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_bundle_variant_selections" ADD CONSTRAINT "order_bundle_variant_selections_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_bundle_variant_selections" ADD CONSTRAINT "order_bundle_variant_selections_variant_group_id_fkey" FOREIGN KEY ("variant_group_id") REFERENCES "variant_product_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_bundle_variant_selections" ADD CONSTRAINT "order_bundle_variant_selections_selected_product_id_fkey" FOREIGN KEY ("selected_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
