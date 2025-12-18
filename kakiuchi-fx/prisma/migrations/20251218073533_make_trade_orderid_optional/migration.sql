-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_orderId_fkey";

-- AlterTable
ALTER TABLE "Trade" ALTER COLUMN "orderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
