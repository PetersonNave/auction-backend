import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards, Request, UseInterceptors, BadRequestException, UploadedFile } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard';
import { PlaceBidDto } from './dto/place-bid.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

@Controller('auction')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @UseGuards(JwtAuthGuard) 
  @UseInterceptors(FileInterceptor('file', {
    // 1. Configuração de Armazenamento
    storage: diskStorage({
      destination: './uploads', // Pasta onde salvar os arquivos
      filename: (req, file, callback) => {
        // Gera um nome único: timestamp + extensão original (ex: 123123-foto.jpg)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB em bytes
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new BadRequestException('Apenas arquivos de imagem são permitidos!'), false);
      }
      callback(null, true);
    },
  }))
  create(@Body() createAuctionDto: CreateAuctionDto,  @Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('A imagem do item é obrigatória.');
    const imageUrl = `https://auction-backend-58a558f43ae3.herokuapp.com/uploads/${file.filename}`;
    const userId = req.user.userId;

    return this.auctionService.create(createAuctionDto, imageUrl, userId);
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Get()
  findAll() {
    return this.auctionService.findAll();
  }

  @UseGuards(JwtAuthGuard) 
  @Post(':id/bid')
  @HttpCode(200) 
  async placeBid(
    @Param('id') id: string, 
    @Body() placeBidDto: PlaceBidDto,
    @Request() req: any 
  ) {
    const userDisplayName = req.user.displayName; 
    const userId = req.user.userId;
    return this.auctionService.placeBid(id, placeBidDto, userId, userDisplayName);
  }
  
  @SkipThrottle()
  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.auctionService.getRecentBids(id);
  }
  
  @SkipThrottle()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auctionService.findOneFull(id);
  }

  @SkipThrottle()
  @Get(':id/state')
  findState(@Param('id') id: string) {
    return this.auctionService.findOneState(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuctionDto: UpdateAuctionDto) {
    return this.auctionService.update(id, updateAuctionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/close')
  async closeAuction(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.auctionService.closeAuction(id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auctionService.remove(id);
  }
}
