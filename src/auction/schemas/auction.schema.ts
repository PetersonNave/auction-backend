import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Document } from 'mongoose';
import { Item } from './item.schema'; 

@Schema({ timestamps: true, optimisticConcurrency: true, versionKey: '__v' })
export class Auction extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  owner: string; 

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true })
  item: Item; 

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop({ default: null })
  highestBidder: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isClosed: boolean;
}

export const AuctionSchema = SchemaFactory.createForClass(Auction);