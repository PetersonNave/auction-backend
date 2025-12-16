import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class PlaceBidDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  currentVersion: number;
}