import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Bid extends Document {
  @Prop({ required: true, index: true })
  auctionId: string; 

  @Prop({ required: true })
  bidder: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  versionAtBidTime: number; 
}

export const BidSchema = SchemaFactory.createForClass(Bid);