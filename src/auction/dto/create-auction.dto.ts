import { IsString, IsNotEmpty, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  item: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(1)
  price: number; 

  @IsDateString() 
  expiresAt: string;
}