import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auction } from './schemas/auction.schema';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { Bid } from './schemas/bid.schema';
import { title } from 'process';
import { Item } from './schemas/item.schema';

@Injectable()
export class AuctionService {
  constructor(
    @InjectModel(Auction.name) private auctionModel: Model<Auction>,
    @InjectModel(Item.name) private itemModel: Model<Item>,
    @InjectModel(Bid.name) private bidModel: Model<Bid>,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  async create(createAuctionDto: CreateAuctionDto, imageUrl: string, ownerId: string) {
    const newItem = new this.itemModel({
      title: createAuctionDto.item,
      description: createAuctionDto.description,
      imageUrl: imageUrl,
    });

    const savedItem = await newItem.save();

    const createdAuction = new this.auctionModel({
      item: savedItem._id,
      price: createAuctionDto.price,
      expiresAt: createAuctionDto.expiresAt,
      owner: ownerId

    });

    return (await createdAuction.save()).populate('item');
  }

  async findAll() {
    return this.auctionModel
      .find()
      .populate([
      { path: "item" },
      { path: "owner", select: "displayName" }
      ])
      .exec();
  }

  async findOneFull(id: string) {
    const cacheKey = this.getAuctionFullCacheKeyById(id);

    const cachedAuction = await this.cacheManager.get(cacheKey);
    if (cachedAuction) {
      console.log('Returning cached auction for id:', id);
      return cachedAuction;
    }

    const auction = await this.auctionModel.findById(id).populate([
      { path: "item" },
      { path: "owner", select: "displayName" }
      ]).exec();
    
    if (!auction) throw new NotFoundException('Leilão não encontrado');
    
    await this.cacheManager.set(cacheKey, auction, 600000);

    return auction;
  }

  async findOneState(id: string) {
    const auction = await this.auctionModel.findById(id)
      .select('price highestBidder __v isClosed expiresAt') 
      .exec();

    if (!auction) throw new NotFoundException('Leilão não encontrado');
    return auction;
  }

  async update(id: string, updateAuctionDto: UpdateAuctionDto) {
    const updatedAuction = await this.auctionModel
      .findByIdAndUpdate(id, updateAuctionDto, { new: true })
      .exec();

    if (updatedAuction) await this.cacheManager.del(this.getAuctionFullCacheKeyById(id));
    else throw new NotFoundException(`Leilão com ID ${id} não encontrado`);
    
    return updatedAuction;
  }

  async remove(id: string) {
    const deletedAuction = await this.auctionModel.findByIdAndDelete(id).exec();

    if (!deletedAuction) {
      throw new NotFoundException(`Leilão com ID ${id} não encontrado`);
    }
    return deletedAuction;
  }

  async placeBid(
    auctionId: string,
    bidDto: PlaceBidDto,
    userId: string,
    userDisplayName: string,
  ) {
    const auction = await this.auctionModel.findById(auctionId);

    if (!auction) throw new NotFoundException('Leilão não encontrado');
    if (auction.isClosed || new Date() > auction.expiresAt) throw new BadRequestException('Leilão encerrado.');
    if (bidDto.amount <= auction.price) throw new BadRequestException(`O lance deve ser maior que R$ ${auction.price}`,);
    if (
      bidDto.currentVersion !== undefined &&
      bidDto.currentVersion !== auction.get('__v')
    ) {
      throw new ConflictException({
        message: 'O estado do leilão mudou. Por favor, atualize os dados.',
        currentPrice: auction.price,
        currentVersion: auction.get('__v'),
      });
    }
    auction.price = bidDto.amount;
    auction.highestBidder = userDisplayName;

    try {
      await auction.save();
    } catch (error) {
      if (error.name === 'VersionError') {
        throw new ConflictException('Conflito de concorrência ao salvar.');
      }
      throw error;
    }

    const bidRecord = new this.bidModel({
      auctionId: auctionId,
      bidder: userDisplayName,
      amount: bidDto.amount,
      versionAtBidTime: auction.get('__v'),
      userId: userId,
    });

    await bidRecord.save();

    const cacheKey = this.getRecentBidCacheKeyById(auctionId);
    await this.cacheManager.del(cacheKey);

    return {
      success: true,
      price: auction.price,
      bidder: auction.highestBidder,
      version: auction.get('__v'),
    };
  }
  async closeAuction(auctionId: string, userId: string) {
    const auction = await this.auctionModel.findById(auctionId);

    if (!auction) {
      throw new NotFoundException('Leilão não encontrado');
    }

    if (auction.owner.toString() !== userId) {
      throw new UnauthorizedException('Você não tem permissão para encerrar este leilão.');
    }

    if (auction.isClosed) {
      throw new BadRequestException('Este leilão já está encerrado.');
    }

    auction.isClosed = true;

    return auction.save();
  }
  async getRecentBids(auctionId: string) {
    const cacheKey = this.getRecentBidCacheKeyById(auctionId);
    const cachedBids = await this.cacheManager.get(cacheKey);
    if (cachedBids) {
      console.log('Returning cached bids for auction id:', auctionId);
      return cachedBids;
    }
    const bids = await this.bidModel
      .find({ auctionId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
    await this.cacheManager.set(cacheKey, bids, 10000);

    return bids;
  }

  private getRecentBidCacheKeyById(auctionId: string): string {
    return `recent_bids_${auctionId}`;
  }
  private getAuctionFullCacheKeyById(auctionId: string): string {
    return `auction_full_${auctionId}`;
  }
}
