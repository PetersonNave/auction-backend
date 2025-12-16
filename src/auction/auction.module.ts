import { Module } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Auction, AuctionSchema } from './schemas/auction.schema';
import { Bid, BidSchema } from './schemas/bid.schema';
import { Item, ItemSchema } from './schemas/item.schema';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register(),
     MongooseModule.forFeature([
      { name: Auction.name, schema: AuctionSchema },
      {name: Item.name, schema: ItemSchema },
      { name: Bid.name, schema: BidSchema },
    ]),
  ],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}
