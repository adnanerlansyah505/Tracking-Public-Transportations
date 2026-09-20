import { IsIn, IsOptional } from 'class-validator';

export class ListDriverRequestsDTO {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';
}
